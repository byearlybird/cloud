import type { Database } from "bun:sqlite";
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

export function get<T>(db: Database, key: KvKey): Promise<KvEntryMaybe<T>> {
  return Promise.resolve().then(() => {
    const keyStr = serializeKey(key);

    const stmt = db.prepare(`
      SELECT value
      FROM kv
      WHERE key = ?
    `);

    const row = stmt.get(keyStr) as { value: string } | undefined;

    if (!row) {
      return { key, value: null };
    }

    const value = JSON.parse(row.value) as T;
    return { key, value };
  });
}

export function getMany<T extends readonly unknown[]>(
  db: Database,
  keys: readonly [...{ [K in keyof T]: KvKey }],
): Promise<{ [K in keyof T]: KvEntryMaybe<T[K]> }> {
  return Promise.resolve().then(() => {
    const keyStrs = keys.map(serializeKey);

    // Use IN query for batch fetch
    const placeholders = keyStrs.map(() => "?").join(",");
    const stmt = db.prepare(`
      SELECT key, value
      FROM kv
      WHERE key IN (${placeholders})
    `);

    const rows = stmt.all(...keyStrs) as Array<{ key: string; value: string }>;
    const rowMap = new Map(rows.map((r) => [r.key, JSON.parse(r.value)]));

    // Return entries in same order as input keys
    return keys.map((key) => {
      const keyStr = serializeKey(key);
      const value = rowMap.get(keyStr) ?? null;
      return { key, value };
    }) as any;
  });
}

export function set(
  db: Database,
  key: KvKey,
  value: unknown,
): Promise<void> {
  return Promise.resolve().then(() => {
    const keyStr = serializeKey(key);
    const valueStr = JSON.stringify(value);

    const stmt = db.prepare(`
      INSERT INTO kv (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value
    `);

    stmt.run(keyStr, valueStr);
  });
}

export function del(db: Database, key: KvKey): Promise<void> {
  return Promise.resolve().then(() => {
    const keyStr = serializeKey(key);
    const stmt = db.prepare(`DELETE FROM kv WHERE key = ?`);
    stmt.run(keyStr);
  });
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
  const rows = stmt.all(...params) as Array<{ key: string; value: string }>;

  // Create async iterator
  return createAsyncIterator<T>(rows);
}

function createAsyncIterator<T>(
  rows: Array<{ key: string; value: string }>,
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

// Track transaction depth to support nested transactions with SAVEPOINTs
let transactionDepth = 0;

export async function transaction<T>(
  db: Database,
  fn: (tx: KV) => Promise<T>,
): Promise<T> {
  const depth = transactionDepth++;
  const savepointName = `sp_${depth}`;
  const isTopLevel = depth === 0;

  try {
    if (isTopLevel) {
      db.run("BEGIN");
    } else {
      db.run(`SAVEPOINT ${savepointName}`);
    }

    // Create a transaction-scoped KV interface using the same database
    const tx: KV = {
      get: (key) => get(db, key),
      getMany: (keys) => getMany(db, keys),
      set: (key, value) => set(db, key, value),
      delete: (key) => del(db, key),
      list: (selector, options) => list(db, selector, options),
      transaction: (innerFn) => transaction(db, innerFn),
      close: () => {
        throw new Error("Cannot close database within a transaction");
      },
    };

    const result = await fn(tx);

    if (isTopLevel) {
      db.run("COMMIT");
    } else {
      db.run(`RELEASE ${savepointName}`);
    }

    return result;
  } catch (error) {
    if (isTopLevel) {
      db.run("ROLLBACK");
    } else {
      db.run(`ROLLBACK TO ${savepointName}`);
    }
    throw error;
  } finally {
    transactionDepth--;
  }
}
