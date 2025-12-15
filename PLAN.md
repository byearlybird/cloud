# Plan: Deno KV-Inspired Abstraction on Bun SQLite

## Overview

Implement a clean key-value store API inspired by Deno KV, using Bun's `bun:sqlite` as the storage backend. The API uses **array-based keys** for hierarchical organization and supports prefix/range queries.

## Core API Design

### Key Concepts

**Array-based keys** (like Deno KV):
```typescript
["users", "alice"]                    // Simple hierarchical key
["documents", userId, "profile.txt"]  // Multi-level hierarchy
["tokens", "hash", tokenHash]         // Natural namespacing
```

**Entry structure**:
```typescript
interface KvEntry<T> {
  key: KvKey;
  value: T;
}

type KvEntryMaybe<T> = KvEntry<T> | KvEntry<null>;
type KvKey = readonly (string | number | boolean)[];
```

---

## Implementation Plan

### Phase 1: Core Storage Layer

#### 1.1 Database Schema

**Single table design:**
```sql
CREATE TABLE kv (
  key TEXT PRIMARY KEY,      -- Serialized key array
  value TEXT NOT NULL,       -- JSON-serialized value
  expires_at INTEGER         -- Unix timestamp in ms (nullable)
);

CREATE INDEX idx_kv_expires ON kv(expires_at) WHERE expires_at IS NOT NULL;
```

**Key serialization strategy:**
```typescript
// Serialize array key to string for SQLite storage
// Use zero-byte (\x00) as separator for lexicographic ordering
["users", "alice"] → "users\x00alice"
["users", "bob"]   → "users\x00bob"

// This enables prefix matching:
// LIKE 'users\x00%' matches all user keys
// AND preserves lexicographic ordering for range queries
```

#### 1.2 Factory Function

```typescript
// /src/db/kv.ts
import { Database } from "bun:sqlite";

export type KvKey = readonly (string | number | boolean)[];

export interface KvEntry<T = unknown> {
  key: KvKey;
  value: T;
}

export interface KvEntryMaybe<T = unknown> {
  key: KvKey;
  value: T | null;
}

export interface KV {
  get<T = unknown>(key: KvKey): Promise<KvEntryMaybe<T>>;
  getMany<T extends readonly unknown[]>(
    keys: readonly [...{ [K in keyof T]: KvKey }]
  ): Promise<{ [K in keyof T]: KvEntryMaybe<T[K]> }>;
  set(key: KvKey, value: unknown, options?: { expireIn?: number }): Promise<void>;
  delete(key: KvKey): Promise<void>;
  list<T = unknown>(selector: KvListSelector, options?: KvListOptions): KvListIterator<T>;
  close(): void;
}

export interface KvListSelector {
  prefix?: KvKey;
  start?: KvKey;
  end?: KvKey;
}

export interface KvListOptions {
  limit?: number;
  reverse?: boolean;
}

export interface KvListIterator<T> extends AsyncIterableIterator<KvEntry<T>> {
  [Symbol.asyncIterator](): KvListIterator<T>;
}

export function createKV(pathOrDb?: string | Database): KV {
  const db = typeof pathOrDb === "string"
    ? new Database(pathOrDb)
    : pathOrDb ?? new Database(":memory:");

  initializeSchema(db);

  return {
    get: (key) => get(db, key),
    getMany: (keys) => getMany(db, keys),
    set: (key, value, options) => set(db, key, value, options),
    delete: (key) => del(db, key),
    list: (selector, options) => list(db, selector, options),
    close: () => db.close(),
  };
}
```

---

### Phase 2: Core Operations

#### 2.1 Key Serialization

```typescript
// /src/db/kv-serialize.ts

const SEPARATOR = "\x00"; // Zero-byte separator for lexicographic ordering

export function serializeKey(key: KvKey): string {
  return key
    .map(part => {
      // Convert to string and escape separators
      const str = String(part);
      if (str.includes(SEPARATOR)) {
        throw new Error(`Key part cannot contain separator: ${str}`);
      }
      return str;
    })
    .join(SEPARATOR);
}

export function deserializeKey(keyStr: string): KvKey {
  return keyStr.split(SEPARATOR);
}

// For prefix matching
export function keyPrefixPattern(prefix: KvKey): string {
  const prefixStr = serializeKey(prefix);
  return `${prefixStr}${SEPARATOR}%`;
}

// For range queries
export function keyRangeStart(key: KvKey): string {
  return serializeKey(key);
}

export function keyRangeEnd(key: KvKey): string {
  // End is exclusive, so we don't need special handling
  return serializeKey(key);
}
```

#### 2.2 get() Implementation

```typescript
// /src/db/kv-operations.ts
import { Database } from "bun:sqlite";
import { serializeKey, deserializeKey } from "./kv-serialize";

export function get<T>(db: Database, key: KvKey): Promise<KvEntryMaybe<T>> {
  return Promise.resolve().then(() => {
    const keyStr = serializeKey(key);
    const now = Date.now();

    const stmt = db.prepare(`
      SELECT value, expires_at
      FROM kv
      WHERE key = ?
        AND (expires_at IS NULL OR expires_at > ?)
    `);

    const row = stmt.get(keyStr, now) as { value: string; expires_at: number | null } | undefined;

    if (!row) {
      return { key, value: null };
    }

    const value = JSON.parse(row.value) as T;
    return { key, value };
  });
}
```

#### 2.3 getMany() Implementation

```typescript
export function getMany<T extends readonly unknown[]>(
  db: Database,
  keys: readonly [...{ [K in keyof T]: KvKey }]
): Promise<{ [K in keyof T]: KvEntryMaybe<T[K]> }> {
  return Promise.resolve().then(() => {
    const now = Date.now();
    const keyStrs = keys.map(serializeKey);

    // Use IN query for batch fetch
    const placeholders = keyStrs.map(() => "?").join(",");
    const stmt = db.prepare(`
      SELECT key, value
      FROM kv
      WHERE key IN (${placeholders})
        AND (expires_at IS NULL OR expires_at > ?)
    `);

    const rows = stmt.all(...keyStrs, now) as Array<{ key: string; value: string }>;
    const rowMap = new Map(rows.map(r => [r.key, JSON.parse(r.value)]));

    // Return entries in same order as input keys
    return keys.map(key => {
      const keyStr = serializeKey(key);
      const value = rowMap.get(keyStr) ?? null;
      return { key, value };
    }) as any;
  });
}
```

#### 2.4 set() Implementation

```typescript
export function set(
  db: Database,
  key: KvKey,
  value: unknown,
  options?: { expireIn?: number }
): Promise<void> {
  return Promise.resolve().then(() => {
    const keyStr = serializeKey(key);
    const valueStr = JSON.stringify(value);
    const expiresAt = options?.expireIn ? Date.now() + options.expireIn : null;

    const stmt = db.prepare(`
      INSERT INTO kv (key, value, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        expires_at = excluded.expires_at
    `);

    stmt.run(keyStr, valueStr, expiresAt);
  });
}
```

#### 2.5 delete() Implementation

```typescript
export function del(db: Database, key: KvKey): Promise<void> {
  return Promise.resolve().then(() => {
    const keyStr = serializeKey(key);
    const stmt = db.prepare(`DELETE FROM kv WHERE key = ?`);
    stmt.run(keyStr);
  });
}
```

---

### Phase 3: List Operation with Iterators

#### 3.1 List Selector Logic

```typescript
export function list<T>(
  db: Database,
  selector: KvListSelector,
  options: KvListOptions = {}
): KvListIterator<T> {
  const { limit, reverse } = options;
  const now = Date.now();

  let query: string;
  let params: any[];

  if (selector.prefix) {
    // Prefix query
    const prefixStr = serializeKey(selector.prefix);
    const pattern = `${prefixStr}${SEPARATOR}%`;

    query = `
      SELECT key, value FROM kv
      WHERE key LIKE ?
        AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY key ${reverse ? "DESC" : "ASC"}
      ${limit ? `LIMIT ?` : ""}
    `;
    params = limit ? [pattern, now, limit] : [pattern, now];

  } else if (selector.start && selector.end) {
    // Range query (start inclusive, end exclusive)
    const startStr = serializeKey(selector.start);
    const endStr = serializeKey(selector.end);

    query = `
      SELECT key, value FROM kv
      WHERE key >= ? AND key < ?
        AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY key ${reverse ? "DESC" : "ASC"}
      ${limit ? `LIMIT ?` : ""}
    `;
    params = limit ? [startStr, endStr, now, limit] : [startStr, endStr, now];

  } else {
    throw new Error("Selector must specify either 'prefix' or both 'start' and 'end'");
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as Array<{ key: string; value: string }>;

  // Create async iterator
  return createAsyncIterator<T>(rows);
}

function createAsyncIterator<T>(
  rows: Array<{ key: string; value: string }>
): KvListIterator<T> {
  let index = 0;

  const iterator: KvListIterator<T> = {
    async next(): Promise<IteratorResult<KvEntry<T>>> {
      if (index >= rows.length) {
        return { done: true, value: undefined };
      }

      const row = rows[index++];
      const entry: KvEntry<T> = {
        key: deserializeKey(row.key),
        value: JSON.parse(row.value) as T,
      };

      return { done: false, value: entry };
    },

    [Symbol.asyncIterator]() {
      return this;
    },
  };

  return iterator;
}
```

---

### Phase 4: Cleanup & Maintenance

#### 4.1 Expired Key Cleanup

```typescript
// Optional: Background cleanup of expired keys
export function cleanupExpired(db: Database): number {
  const now = Date.now();
  const stmt = db.prepare(`
    DELETE FROM kv
    WHERE expires_at IS NOT NULL
      AND expires_at <= ?
  `);

  const result = stmt.run(now);
  return result.changes;
}

// Can be called periodically or before queries
```

---

## Testing Strategy

### Unit Tests

```typescript
// /src/db/kv.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createKV } from "./kv";

describe("KV Store", () => {
  let kv: ReturnType<typeof createKV>;

  beforeEach(() => {
    const db = new Database(":memory:");
    kv = createKV(db);
  });

  describe("get/set", () => {
    test("should set and get a value", async () => {
      await kv.set(["users", "alice"], { name: "Alice" });
      const result = await kv.get(["users", "alice"]);

      expect(result.key).toEqual(["users", "alice"]);
      expect(result.value).toEqual({ name: "Alice" });
    });

    test("should return null for missing key", async () => {
      const result = await kv.get(["users", "bob"]);

      expect(result.key).toEqual(["users", "bob"]);
      expect(result.value).toBeNull();
    });

    test("should overwrite existing value", async () => {
      await kv.set(["users", "alice"], { name: "Alice" });
      await kv.set(["users", "alice"], { name: "Alice Smith" });

      const result = await kv.get(["users", "alice"]);
      expect(result.value).toEqual({ name: "Alice Smith" });
    });
  });

  describe("getMany", () => {
    test("should get multiple values", async () => {
      await kv.set(["users", "alice"], { name: "Alice" });
      await kv.set(["users", "bob"], { name: "Bob" });

      const results = await kv.getMany([
        ["users", "alice"],
        ["users", "bob"],
        ["users", "charlie"], // doesn't exist
      ]);

      expect(results[0].value).toEqual({ name: "Alice" });
      expect(results[1].value).toEqual({ name: "Bob" });
      expect(results[2].value).toBeNull();
    });
  });

  describe("delete", () => {
    test("should delete a value", async () => {
      await kv.set(["users", "alice"], { name: "Alice" });
      await kv.delete(["users", "alice"]);

      const result = await kv.get(["users", "alice"]);
      expect(result.value).toBeNull();
    });

    test("should be no-op for missing key", async () => {
      await kv.delete(["users", "bob"]); // Should not throw
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await kv.set(["users", "alice"], { name: "Alice" });
      await kv.set(["users", "bob"], { name: "Bob" });
      await kv.set(["users", "charlie"], { name: "Charlie" });
      await kv.set(["posts", "1"], { title: "Post 1" });
    });

    test("should list by prefix", async () => {
      const entries = [];
      for await (const entry of kv.list({ prefix: ["users"] })) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(3);
      expect(entries[0].key).toEqual(["users", "alice"]);
      expect(entries[1].key).toEqual(["users", "bob"]);
      expect(entries[2].key).toEqual(["users", "charlie"]);
    });

    test("should list with limit", async () => {
      const entries = [];
      for await (const entry of kv.list(
        { prefix: ["users"] },
        { limit: 2 }
      )) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(2);
    });

    test("should list in reverse", async () => {
      const entries = [];
      for await (const entry of kv.list(
        { prefix: ["users"] },
        { reverse: true }
      )) {
        entries.push(entry);
      }

      expect(entries[0].key).toEqual(["users", "charlie"]);
      expect(entries[2].key).toEqual(["users", "alice"]);
    });

    test("should list by range", async () => {
      const entries = [];
      for await (const entry of kv.list({
        start: ["users", "alice"],
        end: ["users", "charlie"],
      })) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(2); // alice and bob (charlie excluded)
      expect(entries[0].key).toEqual(["users", "alice"]);
      expect(entries[1].key).toEqual(["users", "bob"]);
    });
  });

  describe("expiration", () => {
    test("should expire keys after expireIn ms", async () => {
      await kv.set(["temp"], "value", { expireIn: 100 }); // 100ms

      const result1 = await kv.get(["temp"]);
      expect(result1.value).toBe("value");

      await Bun.sleep(150); // Wait for expiration

      const result2 = await kv.get(["temp"]);
      expect(result2.value).toBeNull();
    });

    test("should not return expired keys in list", async () => {
      await kv.set(["temp", "1"], "value", { expireIn: 100 });
      await kv.set(["temp", "2"], "value"); // No expiration

      await Bun.sleep(150);

      const entries = [];
      for await (const entry of kv.list({ prefix: ["temp"] })) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(1);
      expect(entries[0].key).toEqual(["temp", "2"]);
    });
  });
});
```

### Integration Tests

```typescript
// /src/db/kv.integration.test.ts
import { describe, test, expect } from "bun:test";
import { createKV } from "./kv";

describe("KV Integration", () => {
  test("should persist to file", async () => {
    const dbPath = "/tmp/test-kv.db";

    // Write
    const kv1 = createKV(dbPath);
    await kv1.set(["foo"], "bar");
    kv1.close();

    // Read
    const kv2 = createKV(dbPath);
    const result = await kv2.get(["foo"]);
    expect(result.value).toBe("bar");
    kv2.close();
  });

  test("should handle concurrent operations", async () => {
    const kv = createKV(":memory:");

    // Concurrent sets
    await Promise.all([
      kv.set(["a"], 1),
      kv.set(["b"], 2),
      kv.set(["c"], 3),
    ]);

    // Concurrent gets
    const results = await Promise.all([
      kv.get(["a"]),
      kv.get(["b"]),
      kv.get(["c"]),
    ]);

    expect(results[0].value).toBe(1);
    expect(results[1].value).toBe(2);
    expect(results[2].value).toBe(3);
  });
});
```

---

## File Structure

```
/src/db/
├── kv.ts                    # Main KV interface and factory
├── kv-operations.ts         # Core operations (get, set, delete, list)
├── kv-serialize.ts          # Key serialization utilities
├── kv-schema.ts             # Database schema initialization
├── kv.test.ts               # Unit tests
└── kv.integration.test.ts   # Integration tests
```

---

## Migration from Current System

### Mapping Current Tables to KV Keys

```typescript
// Users: email as primary lookup
["users", "by-email", email] → UserObject
["users", "by-id", id] → UserObject

// Tokens: hash as primary lookup
["tokens", "by-hash", hash] → TokenObject
["tokens", "by-id", id] → TokenObject
["tokens", "by-user", userId, tokenId] → TokenObject

// Documents: composite key
["documents", userId, documentKey] → DocumentData

// Example usage:
await kv.set(["users", "by-email", "alice@example.com"], {
  id: "uuid-123",
  email: "alice@example.com",
  hashedPassword: "...",
});

await kv.set(["users", "by-id", "uuid-123"], {
  id: "uuid-123",
  email: "alice@example.com",
  hashedPassword: "...",
});

// List all documents for a user:
for await (const doc of kv.list({ prefix: ["documents", userId] })) {
  console.log(doc.key, doc.value);
}
```

---

## Benefits

✅ **Schemaless**: No migrations, add new key patterns anytime
✅ **Simple API**: Familiar Deno KV interface
✅ **Hierarchical keys**: Natural namespacing with arrays
✅ **Efficient queries**: Prefix and range scans
✅ **Type-safe**: Full TypeScript support
✅ **Lightweight**: No ORM, just SQLite
✅ **Flexible**: Easy to add features (TTL, transactions, etc.)

---

## Next Steps

1. **Implement core KV layer** (Phase 1-3)
   - Create schema and serialization
   - Implement get/set/delete/getMany
   - Implement list with iterators

2. **Add comprehensive tests**
   - Unit tests for all operations
   - Integration tests
   - Edge cases and error handling

3. **Update one repository** (e.g., DocumentRepo)
   - Rewrite using KV API
   - Maintain same interface
   - Verify tests pass

4. **Migrate remaining repositories**
   - UserRepo
   - TokenRepo
   - Update all services

5. **Remove Drizzle dependency**
   - Delete schema files
   - Remove from package.json
   - Update documentation

---

## Open Questions

1. **Transactions**: Do we need atomic multi-key updates?
   - Could add: `kv.atomic().set(...).set(...).commit()`
   - Deno KV has this, but do we need it?

2. **Batch operations**: Do we need `setMany()` and `deleteMany()`?
   - Would improve performance for bulk operations

3. **Indexes**: Do we need explicit secondary indexes?
   - Currently handled by dual-writes to multiple keys
   - Could optimize with dedicated index table

4. **Watch API**: Do we need change notifications?
   - Deno KV has `watch()` for reactivity
   - Probably not needed for this use case

**Recommendation**: Start simple, add features as needed.