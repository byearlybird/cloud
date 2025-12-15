import type { SQLiteAdapter } from "./adapters/sqlite-adapter";

export function initializeSchema(adapter: SQLiteAdapter): void {
  adapter.run(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}
