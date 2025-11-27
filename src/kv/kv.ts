import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";

export interface KVStore {
	get<T = unknown>(key: string[]): T | null;
	set<T = unknown>(key: string[], value: T): void;
	close(): void;
}

export function createKV(dbPath: string = ":memory:"): KVStore {
	// Initialize database
	const db = new Database(dbPath, { create: true });

	// Enable WAL mode for better concurrency
	db.run("PRAGMA journal_mode = WAL;");

	// Create table
	db.run(`
    CREATE TABLE IF NOT EXISTS key_value (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT
    )
  `);

	// Create index for fast lookups
	db.run("CREATE INDEX IF NOT EXISTS idx_key ON key_value(key);");

	// Prepare statements
	const getStmt = db.query<{ value: string | null }, { $key: string }>(
		"SELECT value FROM key_value WHERE key = $key",
	);

	const setStmt = db.query<void, { $id: string; $key: string; $value: string }>(
		`INSERT INTO key_value (id, key, value)
     VALUES ($id, $key, $value)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
	);

	return {
		get<T = unknown>(key: string[]): T | null {
			// Validate input
			if (!Array.isArray(key) || key.length === 0) {
				throw new Error("Key must be a non-empty array of strings");
			}

			// Concatenate with '/' separator
			const concatenatedKey = key.join("/");

			// Query database
			const row = getStmt.get({ $key: concatenatedKey });

			// Return null if not found
			if (!row || row.value === null) {
				return null;
			}

			// Deserialize JSON
			try {
				return JSON.parse(row.value);
			} catch (error) {
				throw new Error(
					`Failed to parse value for key "${concatenatedKey}": ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		},

		set<T = unknown>(key: string[], value: T): void {
			// Validate input
			if (!Array.isArray(key) || key.length === 0) {
				throw new Error("Key must be a non-empty array of strings");
			}

			// Concatenate key
			const concatenatedKey = key.join("/");

			// Serialize value
			let serializedValue: string;
			try {
				serializedValue = JSON.stringify(value);
			} catch (error) {
				throw new Error(
					`Failed to serialize value for key "${concatenatedKey}": ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}

			// Generate UUID and upsert
			const id = randomUUID();
			setStmt.run({
				$id: id,
				$key: concatenatedKey,
				$value: serializedValue,
			});
		},

		close(): void {
			db.close();
		},
	};
}
