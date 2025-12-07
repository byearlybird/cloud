import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { type RefreshTokenRow, refreshTokens } from "@/db/schema";
import { Result } from "@/shared/result";

export type TokenRepo = {
	create: (
		userId: string,
		tokenHash: string,
	) => Promise<Result<RefreshTokenRow>>;
	getByHash: (tokenHash: string) => Promise<Result<RefreshTokenRow | null>>;
	updateLastUsed: (id: string) => Promise<Result<void>>;
	revoke: (tokenHash: string) => Promise<Result<void>>;
};

export function createTokenRepo(db: Database): TokenRepo {
	return {
		create(userId, tokenHash) {
			return Result.wrapAsync(async () => {
				const token = await db
					.insert(refreshTokens)
					.values({ userId, tokenHash })
					.returning()
					.then((r) => r.at(0));

				if (token) {
					return token;
				}

				throw new Error("Failed to create refresh token");
			});
		},

		getByHash(tokenHash) {
			return Result.wrapAsync(async () => {
				const token = await db
					.select()
					.from(refreshTokens)
					.where(eq(refreshTokens.tokenHash, tokenHash))
					.limit(1)
					.then((r) => r.at(0));

				return token ?? null;
			});
		},

		updateLastUsed(id) {
			return Result.wrapAsync(async () => {
				await db
					.update(refreshTokens)
					.set({ lastUsedAt: new Date().toISOString() })
					.where(eq(refreshTokens.id, id));
			});
		},

		revoke(tokenHash) {
			return Result.wrapAsync(async () => {
				await db
					.update(refreshTokens)
					.set({ revokedAt: new Date().toISOString() })
					.where(eq(refreshTokens.tokenHash, tokenHash));
			});
		},
	};
}
