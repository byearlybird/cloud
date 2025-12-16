import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { connect } from "@tursodatabase/database";
import { env } from "@/env";
import { createKV } from "./kv";

function ensureDatabaseDir(databasePath: string) {
	// Skip directory creation for in-memory db and URL-style connections.
	if (databasePath === ":memory:") {
		return;
	}
	if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(databasePath)) {
		return;
	}

	mkdirSync(dirname(databasePath), { recursive: true });
}

ensureDatabaseDir(env.DATABASE_PATH);

// Initialize Turso database connection for KV store
const tursoDatabase = await connect(env.DATABASE_PATH);

// Initialize KV store
export const kv = await createKV(tursoDatabase);

/**
 * Close the database connections
 * Call this when shutting down the application
 */
export async function closeDatabase() {
	await kv.close();
}
