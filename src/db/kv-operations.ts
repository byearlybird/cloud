import type { Database } from "@tursodatabase/database";
import type {
  KV,
  KvKey,
  KvEntryMaybe,
  KvEntry,
  KvListSelector,
  KvListOptions,
  KvListIterator,
} from "./kv-types";
import { serializeKey, deserializeKey, SEPARATOR } from "./kv-serialize";

export async function get<T>(db: Database, key: KvKey): Promise<KvEntryMaybe<T>> {
  const keyStr = serializeKey(key);

  const stmt = db.prepare(`
    SELECT value
    FROM kv
    WHERE key = ?
  `);

  const row = (await stmt.get(keyStr)) as { value: string } | undefined;

  if (!row) {
    return { key, value: null };
  }

  const value = JSON.parse(row.value) as T;
  return { key, value };
}

export async function getMany<T extends readonly unknown[]>(
  db: Database,
  keys: readonly [...{ [K in keyof T]: KvKey }],
): Promise<{ [K in keyof T]: KvEntryMaybe<T[K]> }> {
  const keyStrs = keys.map(serializeKey);

  // Use IN query for batch fetch
  const placeholders = keyStrs.map(() => "?").join(",");
  const stmt = db.prepare(`
    SELECT key, value
    FROM kv
    WHERE key IN (${placeholders})
  `);

  const rows = (await stmt.all(...keyStrs)) as Array<{ key: string; value: string }>;
  const rowMap = new Map(rows.map((r) => [r.key, JSON.parse(r.value)]));

  // Return entries in same order as input keys
  return keys.map((key) => {
    const keyStr = serializeKey(key);
    const value = rowMap.get(keyStr) ?? null;
    return { key, value };
  }) as any;
}

export async function set(
  db: Database,
  key: KvKey,
  value: unknown,
): Promise<void> {
  const keyStr = serializeKey(key);
  const valueStr = JSON.stringify(value);

  const stmt = db.prepare(`
    INSERT INTO kv (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value
  `);

  await stmt.run(keyStr, valueStr);
}

export async function del(db: Database, key: KvKey): Promise<void> {
  const keyStr = serializeKey(key);
  const stmt = db.prepare(`DELETE FROM kv WHERE key = ?`);
  await stmt.run(keyStr);
}

export function list<T>(
  db: Database,
  selector: KvListSelector,
  options: KvListOptions = {},
): KvListIterator<T> {
  const { limit, reverse } = options;

  let query: string;
  let params: any[];

  if (selector.prefix) {
    // Prefix query
    const prefixStr = serializeKey(selector.prefix);
    const pattern = `${prefixStr}${SEPARATOR}%`;

    query = `
      SELECT key, value FROM kv
      WHERE key LIKE ?
      ORDER BY key ${reverse ? "DESC" : "ASC"}
      ${limit ? `LIMIT ?` : ""}
    `;
    params = limit ? [pattern, limit] : [pattern];
  } else if (selector.start && selector.end) {
    // Range query (start inclusive, end exclusive)
    const startStr = serializeKey(selector.start);
    const endStr = serializeKey(selector.end);

    query = `
      SELECT key, value FROM kv
      WHERE key >= ? AND key < ?
      ORDER BY key ${reverse ? "DESC" : "ASC"}
      ${limit ? `LIMIT ?` : ""}
    `;
    params = limit ? [startStr, endStr, limit] : [startStr, endStr];
  } else {
    throw new Error(
      "Selector must specify either 'prefix' or both 'start' and 'end'",
    );
  }

  const stmt = db.prepare(query);
  const rowsPromise = stmt.all(...params);

  // Create async iterator
  return createAsyncIterator<T>(rowsPromise);
}

function createAsyncIterator<T>(
  rowsPromise: Promise<Array<{ key: string; value: string }>>,
): KvListIterator<T> {
  let rows: Array<{ key: string; value: string }> | null = null;
  let index = 0;

  const iterator: KvListIterator<T> = {
    async next(): Promise<IteratorResult<KvEntry<T>>> {
      // Lazy load rows on first iteration
      if (rows === null) {
        rows = await rowsPromise;
      }

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

export async function transaction<T>(
  db: Database,
  fn: (tx: KV) => Promise<T>,
): Promise<T> {
  // Try to begin a transaction - some databases (like in-memory) might not support it
  let transactionStarted = false;
  try {
    await db.exec("BEGIN");
    transactionStarted = true;
  } catch {
    // Transaction not supported, continue without transaction
  }

  try {
    // Create a transaction-scoped KV interface using the same database
    const tx: KV = {
      get: (key) => get(db, key),
      getMany: (keys) => getMany(db, keys),
      set: (key, value) => set(db, key, value),
      delete: (key) => del(db, key),
      list: (selector, options) => list(db, selector, options),
      transaction: () => {
        throw new Error("Nested transactions are not supported");
      },
      close: () => {
        throw new Error("Cannot close database within a transaction");
      },
    };

    const result = await fn(tx);

    if (transactionStarted) {
      try {
        await db.exec("COMMIT");
      } catch {
        // COMMIT failed, transaction might have auto-committed/rolled back
      }
    }

    return result;
  } catch (error) {
    // Try to rollback if we started a transaction
    if (transactionStarted) {
      try {
        await db.exec("ROLLBACK");
      } catch {
        // Transaction might already be rolled back, ignore
      }
    }
    throw error;
  }
}
