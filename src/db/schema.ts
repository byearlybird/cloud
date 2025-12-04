import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";

/**
 * Users table - stores authentication data
 * Maps from KV pattern: ["auth", email]
 */
export const users = table("users", {
	id: t.text().primaryKey(), // UUID v4
	email: t.text().notNull().unique(),
	hashedPassword: t.text("hashed_password").notNull(),
	encryptedMasterKey: t.text("encrypted_master_key").notNull(),
	createdAt: t.text("created_at").notNull(), // ISO 8601 datetime
});

/**
 * Refresh tokens table - stores revoked tokens for security
 * Only revoked tokens are stored; absence means token is valid
 * Maps from KV pattern: ["token", userId, tokenHash]
 */
export const refreshTokens = table(
	"refresh_tokens",
	{
		id: t.text().primaryKey(), // UUID v4
		userId: t
			.text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		tokenHash: t.text("token_hash").notNull(), // Bun.hash() of JWT
		revokedAt: t.text("revoked_at").notNull(), // ISO 8601 datetime
	},
	(table) => [
		// Composite unique index for fast token validation
		// Query pattern: WHERE user_id = ? AND token_hash = ?
		t.uniqueIndex("idx_refresh_tokens_user_hash").on(
			table.userId,
			table.tokenHash,
		),
	],
);

/**
 * Documents table - stores user documents in JSON:API format
 * The documentData column contains the full JsonDocument<AnyObject> structure
 * Maps from KV pattern: ["document", userId, documentKey]
 */
export const documents = table(
	"documents",
	{
		id: t.text().primaryKey(), // UUID v4
		userId: t
			.text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		documentKey: t.text("document_key").notNull(), // e.g., "settings", "notes"
		documentData: t.text("document_data").notNull(), // JSON serialized JsonDocument<AnyObject>
	},
	(table) => [
		// Composite unique index ensures one document per user per key
		// Query pattern: WHERE user_id = ? AND document_key = ?
		t.uniqueIndex("idx_documents_user_key").on(table.userId, table.documentKey),
	],
);

/**
 * Type exports for use in application code
 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
