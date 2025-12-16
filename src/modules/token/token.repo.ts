import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { type RefreshTokenRow, refreshTokens } from "@/db/schema";

export type TokenRepo = {
	create: (userId: string, tokenHash: string) => Promise<RefreshTokenRow>;
	getByHash: (tokenHash: string) => Promise<RefreshTokenRow | null>;
	updateLastUsed: (id: string) => Promise<void>;
	revoke: (tokenHash: string) => Promise<void>;
};

export function createTokenRepo(db: Database): TokenRepo {
	return {
		async create(userId, tokenHash) {
			const token = await db
				.insert(refreshTokens)
				.values({ userId, tokenHash })
				.returning()
				.then((r) => r.at(0));

			if (token) {
				return token;
			}

			throw new Error("Failed to create refresh token");
		},

		async getByHash(tokenHash) {
			const token = await db
				.select()
				.from(refreshTokens)
				.where(eq(refreshTokens.tokenHash, tokenHash))
				.limit(1)
				.then((r) => r.at(0));

			return token ?? null;
		},

		async updateLastUsed(id) {
			await db
				.update(refreshTokens)
				.set({ lastUsedAt: new Date().toISOString() })
				.where(eq(refreshTokens.id, id));
		},

		async revoke(tokenHash) {
			await db
				.update(refreshTokens)
				.set({ revokedAt: new Date().toISOString() })
				.where(eq(refreshTokens.tokenHash, tokenHash));
		},
	};
}
