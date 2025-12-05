import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { db as database } from "./index";

export async function runMigrations(db: typeof database) {
	try {
		await migrate(db, { migrationsFolder: "drizzle" });
		console.log("Migration completed");
	} catch (error) {
		console.error("Error during migration:", error);
		process.exit(1);
	}
}
