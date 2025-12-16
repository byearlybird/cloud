import type { Database } from "@tursodatabase/database";
import { del, get, getMany, list, set, transaction } from "./kv-operations";
import { initializeSchema } from "./kv-schema";
import type { KV } from "./kv-types";

export * from "./kv-types";

/**
 * Create a KV store instance using an injected Turso database.
 *
 * @param db - Turso Database instance
 *
 * @example
 * ```ts
 * import { connect } from "@tursodatabase/database";
 * import { createKV } from "./kv";
 *
 * // In-memory database
 * const db = await connect(":memory:");
 * const kv = await createKV(db);
 *
 * // File-based database
 * const db = await connect("./data.db");
 * const kv = await createKV(db);
 *
 * // Remote Turso database
 * const db = await connect({ url: "libsql://your-database.turso.io" });
 * const kv = await createKV(db);
 * ```
 */
export async function createKV(db: Database): Promise<KV> {
	await initializeSchema(db);

	return {
		get: (key) => get(db, key),
		getMany: (keys) => getMany(db, keys),
		set: (key, value) => set(db, key, value),
		delete: (key) => del(db, key),
		list: (selector, options) => list(db, selector, options),
		transaction: (fn) => transaction(db, fn),
		close: () => db.close(),
	};
}
