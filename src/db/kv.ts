import { Database } from "bun:sqlite";
import type { KV } from "./kv-types";
import type { SQLiteAdapter } from "./adapters/sqlite-adapter";
import { createBunAdapter } from "./adapters/bun-adapter";
import { initializeSchema } from "./kv-schema";
import { get, getMany, set, del, list, transaction } from "./kv-operations";

export * from "./kv-types";
export * from "./adapters/sqlite-adapter";
export * from "./adapters/bun-adapter";

/**
 * Create a KV store instance.
 *
 * @param pathOrDbOrAdapter - Can be:
 *   - string: Path to SQLite database file
 *   - Database: Bun SQLite database instance
 *   - SQLiteAdapter: Custom adapter implementation
 *   - undefined: Creates an in-memory database
 */
export function createKV(pathOrDbOrAdapter?: string | Database | SQLiteAdapter): KV {
  let adapter: SQLiteAdapter;

  if (!pathOrDbOrAdapter) {
    // Default: in-memory database
    adapter = createBunAdapter();
  } else if (typeof pathOrDbOrAdapter === "string") {
    // String path: create Bun adapter with file
    adapter = createBunAdapter(pathOrDbOrAdapter);
  } else if (pathOrDbOrAdapter instanceof Database) {
    // Bun Database instance: wrap in adapter
    adapter = createBunAdapter(pathOrDbOrAdapter);
  } else {
    // Already an adapter: use directly
    adapter = pathOrDbOrAdapter;
  }

  initializeSchema(adapter);

  return {
    get: (key) => get(adapter, key),
    getMany: (keys) => getMany(adapter, keys),
    set: (key, value) => set(adapter, key, value),
    delete: (key) => del(adapter, key),
    list: (selector, options) => list(adapter, selector, options),
    transaction: (fn) => transaction(adapter, fn),
    close: () => adapter.close(),
  };
}
