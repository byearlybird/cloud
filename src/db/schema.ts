import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as t from "drizzle-orm/sqlite-core";
import { sqliteTable } from "drizzle-orm/sqlite-core";

const timestamps = {
	createdAt: t
		.text()
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updatedAt: t
		.text()
		.notNull()
		.$defaultFn(() => new Date().toISOString())
		.$onUpdateFn(() => new Date().toISOString()),
};

export const users = sqliteTable("users", (t) => ({
	id: t
		.text()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()), // UUID v4
	email: t.text().notNull().unique(),
	hashedPassword: t.text().notNull(),
	encryptedMasterKey: t.text().notNull(),
	...timestamps,
}));

/**
 * Refresh tokens table - stores all refresh tokens
 * Tokens are marked as revoked when user logs out or during token rotation
 */
export const refreshTokens = sqliteTable(
	"refresh_tokens",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: t
			.text()
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		tokenHash: t.text().notNull(), // Bun.hash() of JWT
		revokedAt: t.text(), // ISO 8601 datetime - null = active, set = revoked
		lastUsedAt: t
			.text()
			.notNull()
			.$defaultFn(() => new Date().toISOString()), // ISO 8601 datetime
		...timestamps,
	}),
	(table) => [
		t
			.uniqueIndex("idx_refresh_tokens_user_hash")
			.on(table.userId, table.tokenHash),
		t.index("idx_refresh_tokens_user_id").on(table.userId),
		t.index("idx_refresh_tokens_revoked_at").on(table.revokedAt),
	],
);

/**
 * Blobs table - stores user blob data
 * The blobData column contains binary blob data
 */
export const blobs = sqliteTable(
	"blobs",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: t
			.text()
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		blobKey: t.text().notNull(), // e.g., "settings", "notes"
		blobData: t.blob().notNull(),
		...timestamps,
	}),
	(table) => [
		t.uniqueIndex("idx_blobs_user_key").on(table.userId, table.blobKey),
	],
);

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type RefreshTokenRow = InferSelectModel<typeof refreshTokens>;
export type NewRefreshTokenRow = InferInsertModel<typeof refreshTokens>;

export type Blob = InferSelectModel<typeof blobs>;
export type NewBlob = InferInsertModel<typeof blobs>;
