import type { Database } from "bun:sqlite";

export function initializeSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}
