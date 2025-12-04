import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

/**
 * Database connection and Drizzle instance
 * Uses Bun's native SQLite bindings for optimal performance
 */

// Get database path from environment or use default
const dbPath = Bun.env.DATABASE_PATH || "./data/cloud.db";

// Initialize SQLite database with Bun's native driver
const sqlite = new Database(dbPath, { create: true });

// Enable WAL mode for better concurrency
sqlite.run("PRAGMA journal_mode = WAL;");

// Initialize Drizzle ORM with the schema
export const db = drizzle(sqlite, { schema });

// Export the raw SQLite instance if needed for advanced operations
export { sqlite };

/**
 * Close the database connection
 * Call this when shutting down the application
 */
export function closeDatabase() {
	sqlite.close();
}
