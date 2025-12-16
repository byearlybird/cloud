import { Database as SQLite } from "bun:sqlite";
import { connect } from "@tursodatabase/database";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { env } from "@/env";
import { createKV } from "./kv";
import * as schema from "./schema";

/**
 * Database connections
 * - Drizzle ORM for legacy tables (users, tokens)
 * - KV store for new document storage
 */

// Ensure the database directory exists
mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });

// Initialize Bun SQLite database for Drizzle
const client = new SQLite(env.DATABASE_PATH, { create: true });
client.run("PRAGMA journal_mode = WAL;");

// Initialize Drizzle ORM with the schema (for users and tokens)
export const db = drizzle({
	client,
	schema,
	casing: "snake_case",
});

// Initialize Turso database connection for KV store
const tursoDatabase = await connect(env.DATABASE_PATH);

// Initialize KV store (for documents)
export const kv = await createKV(tursoDatabase);

/**
 * Close the database connections
 * Call this when shutting down the application
 */
export async function closeDatabase() {
	client.close();
	await kv.close();
}

export type Database = typeof db;
