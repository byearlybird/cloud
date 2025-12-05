import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

/**
 * Create an in-memory test database with all migrations applied
 */
export async function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.run("PRAGMA journal_mode = WAL;");

	const db = drizzle({
		client: sqlite,
		schema,
		casing: "snake_case",
	});

	// Run migrations to set up schema
	await migrate(db, { migrationsFolder: "./drizzle" });

	return { db, sqlite };
}

/**
 * Clean up test database by closing connection
 */
export function cleanupTestDb(sqlite: Database) {
	sqlite.close();
}
