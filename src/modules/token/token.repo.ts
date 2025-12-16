import type { KV } from "@/db/kv";

export type RefreshToken = {
	id: string;
	userId: string;
	tokenHash: string;
	revokedAt: string | null;
	lastUsedAt: string;
	createdAt: string;
	updatedAt: string;
};

export type TokenRepo = {
	create: (
		userId: string,
		tokenHash: string,
	) => Promise<RefreshToken>;
	getByHash: (tokenHash: string) => Promise<RefreshToken | null>;
	updateLastUsed: (id: string) => Promise<void>;
	revoke: (tokenHash: string) => Promise<void>;
};

export function createTokenRepo(kv: KV): TokenRepo {
	return {
		async create(userId, tokenHash) {
			const tokenId = crypto.randomUUID();
			const now = new Date().toISOString();

			const token: RefreshToken = {
				id: tokenId,
				userId,
				tokenHash,
				revokedAt: null,
				lastUsedAt: now,
				createdAt: now,
				updatedAt: now,
			};

			await kv.transaction(async (tx) => {
				// Set token data
				await tx.set(["tokens", "id", tokenId], token);

				// Set hash index
				await tx.set(["tokens", "index", "hash", tokenHash], tokenId);

				// Set user index (for listing/deleting user's tokens)
				await tx.set(["tokens", "index", "user", userId, tokenId], tokenId);
			});

			return token;
		},

		async getByHash(tokenHash) {
			// Look up token ID by hash index
			const indexEntry = await kv.get<string>(["tokens", "index", "hash", tokenHash]);
			if (!indexEntry.value) {
				return null;
			}

			// Get token data by ID
			const tokenEntry = await kv.get<RefreshToken>(["tokens", "id", indexEntry.value]);
			return tokenEntry.value;
		},

		async updateLastUsed(id) {
			// Get current token
			const entry = await kv.get<RefreshToken>(["tokens", "id", id]);
			if (!entry.value) {
				return;
			}

			// Update lastUsedAt and updatedAt
			entry.value.lastUsedAt = new Date().toISOString();
			entry.value.updatedAt = new Date().toISOString();

			await kv.set(["tokens", "id", id], entry.value);
		},

		async revoke(tokenHash) {
			// Look up token ID by hash index
			const indexEntry = await kv.get<string>(["tokens", "index", "hash", tokenHash]);
			if (!indexEntry.value) {
				return;
			}

			// Get token data
			const tokenEntry = await kv.get<RefreshToken>(["tokens", "id", indexEntry.value]);
			if (!tokenEntry.value) {
				return;
			}

			// Update revokedAt and updatedAt
			tokenEntry.value.revokedAt = new Date().toISOString();
			tokenEntry.value.updatedAt = new Date().toISOString();

			await kv.set(["tokens", "id", indexEntry.value], tokenEntry.value);
		},
	};
}
