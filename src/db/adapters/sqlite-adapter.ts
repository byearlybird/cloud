/**
 * Minimal SQLite adapter interface for the KV store.
 * Implementations can use bun:sqlite, better-sqlite3, or other SQLite drivers.
 */
export interface SQLiteAdapter {
  /**
   * Execute a SQL statement without returning results.
   * Used for CREATE TABLE, BEGIN, COMMIT, ROLLBACK, etc.
   */
  run(sql: string, ...params: any[]): void;

  /**
   * Prepare a SQL statement for execution.
   * Returns a prepared statement that can be executed multiple times.
   */
  prepare(sql: string): PreparedStatement;

  /**
   * Close the database connection.
   */
  close(): void;
}

/**
 * Prepared statement interface.
 * Allows efficient execution of the same query with different parameters.
 */
export interface PreparedStatement {
  /**
   * Execute the statement and return a single row, or undefined if no rows match.
   */
  get(...params: any[]): any | undefined;

  /**
   * Execute the statement and return all matching rows.
   */
  all(...params: any[]): any[];

  /**
   * Execute the statement and return metadata about the operation.
   */
  run(...params: any[]): { changes: number };
}
