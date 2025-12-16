import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../env";
import { kv } from ".";

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

export async function migrate() {
	try {
		ensureDatabaseDir(env.DATABASE_PATH);

		// KV schema initialization happens during `kv` creation; this call just
		// forces initialization to complete (and fails fast on connection issues).
		await kv.get(["__kv__", "init"]);
	} catch (ex) {
		console.error(ex);
		process.exit(1);
	}
}
