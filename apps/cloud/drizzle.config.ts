import { defineConfig } from "drizzle-kit";

export default defineConfig({
	// Database driver
	dialect: "sqlite",

	// Schema files location
	schema: "./src/db/schema.ts",

	// Output directory for migrations
	out: "./drizzle",

	// Database connection
	dbCredentials: {
		url: process.env.DATABASE_PATH || "./data/cloud.db",
	},

	// Enable verbose logging during development
	verbose: true,

	// Enable strict mode for safer migrations
	strict: true,
	casing: "snake_case",
});
