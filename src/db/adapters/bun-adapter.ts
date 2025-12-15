import { Database } from "bun:sqlite";
import type { SQLiteAdapter, PreparedStatement } from "./sqlite-adapter";

/**
 * SQLite adapter for Bun's native sqlite implementation.
 */
export class BunSQLiteAdapter implements SQLiteAdapter {
  constructor(private db: Database) {}

  run(sql: string, ...params: any[]): void {
    this.db.run(sql, ...params);
  }

  prepare(sql: string): PreparedStatement {
    return this.db.prepare(sql);
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Helper function to create a Bun SQLite adapter.
 */
export function createBunAdapter(pathOrDb?: string | Database): BunSQLiteAdapter {
  if (typeof pathOrDb === "string") {
    return new BunSQLiteAdapter(new Database(pathOrDb));
  } else if (pathOrDb instanceof Database) {
    return new BunSQLiteAdapter(pathOrDb);
  } else {
    return new BunSQLiteAdapter(new Database(":memory:"));
  }
}
