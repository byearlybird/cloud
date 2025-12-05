import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Database connection and Drizzle instance
 * Uses Bun's native SQLite bindings for optimal performance
 */

// Get database path from environment or use default

// Ensure the database directory exists
mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });

// Initialize SQLite database with Bun's native driver
const client = new Database(env.DATABASE_PATH, { create: true });

// Enable WAL mode for better concurrency
client.run("PRAGMA journal_mode = WAL;");

// Initialize Drizzle ORM with the schema
export const db = drizzle({
	client,
	schema,
	casing: "snake_case",
});

/**
 * Close the database connection
 * Call this when shutting down the application
 */
export function closeDatabase() {
	client.close();
}
