import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { migrate as drizzleMigrate } from "drizzle-orm/bun-sqlite/migrator";
import { env } from "../env";
import { db } from ".";

export async function migrate() {
	try {
		mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });
		const result = await drizzleMigrate(db, { migrationsFolder: "./drizzle" });
		if (result) {
			console.info(result);
		}
	} catch (ex) {
		console.error(ex);
		process.exit(1);
	}
}
