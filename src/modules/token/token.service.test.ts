import { describe, expect, test } from "bun:test";

import { hashToken } from "./token.domain";
import type { RefreshToken, TokenRepo } from "./token.repo";
import type { TokenConfig } from "./token.schema";
import { createTokenService } from "./token.service";

const config: TokenConfig = {
	accessTokenSecret: "access-secret",
	refreshTokenSecret: "refresh-secret",
	accessTokenExpiry: 60,
	refreshTokenExpiry: 120,
};

function buildRow(overrides: Partial<RefreshToken> = {}): RefreshToken {
	const now = new Date().toISOString();
	return {
		id: overrides.id ?? crypto.randomUUID(),
		userId: overrides.userId ?? "user-id",
		tokenHash: overrides.tokenHash ?? "hash",
		revokedAt: overrides.revokedAt ?? null,
		lastUsedAt: overrides.lastUsedAt ?? now,
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	};
}

describe("token.service", () => {
	test("issueTokens stores a hashed refresh token", async () => {
		const calls: { userId: string; tokenHash: string }[] = [];
		const repo: TokenRepo = {
			async create(userId, tokenHash) {
				calls.push({ userId, tokenHash });
				return buildRow({ userId, tokenHash });
			},
			async getByHash() {
				throw new Error("getByHash should not run");
			},
			async updateLastUsed() {
				throw new Error("updateLastUsed should not run");
			},
			async revoke() {
				throw new Error("revoke should not run");
			},
		};

		const service = createTokenService(repo, config);
		const userId = crypto.randomUUID();
		const value = await service.issueTokens(userId, "user@example.com");

		expect(value.accessToken.length).toBeGreaterThan(0);
		expect(value.refreshToken.length).toBeGreaterThan(0);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.userId).toBe(userId);
		const storedHash = calls[0]?.tokenHash;
		expect(storedHash).toBe(hashToken(value.refreshToken));
	});

	test("refresh validates the token and updates last used timestamps", async () => {
		const storedRows = new Map<string, RefreshTokenRow>();
		let updateCount = 0;

		const repo: TokenRepo = {
			async create(userId, tokenHash) {
				const row = buildRow({ userId, tokenHash });
				storedRows.set(tokenHash, row);
				return row;
			},
			async getByHash(tokenHash) {
				return storedRows.get(tokenHash) ?? null;
			},
			async updateLastUsed(id) {
				for (const row of storedRows.values()) {
					if (row.id === id) {
						updateCount += 1;
						return;
					}
				}
				throw new Error("token missing");
			},
			async revoke(tokenHash) {
				const row = storedRows.get(tokenHash);
				if (row) {
					storedRows.set(tokenHash, {
						...row,
						revokedAt: new Date().toISOString(),
					});
				}
			},
		};

		const service = createTokenService(repo, config);
		const userId = crypto.randomUUID();
		const issueValue = await service.issueTokens(userId, "user@example.com");

		const refreshValue = await service.refresh(issueValue.refreshToken);

		expect(refreshValue.accessToken.length).toBeGreaterThan(0);
		expect(updateCount).toBe(1);
	});

	test("revoke hashes the token before calling the repository", async () => {
		const revokedHashes: string[] = [];
		const repo: TokenRepo = {
			async create(userId, tokenHash) {
				return buildRow({ userId, tokenHash });
			},
			async getByHash() {
				return null;
			},
			async updateLastUsed() {
				return;
			},
			async revoke(tokenHash) {
				revokedHashes.push(tokenHash);
			},
		};

		const service = createTokenService(repo, config);
		const userId = crypto.randomUUID();
		const issueValue = await service.issueTokens(userId, "user@example.com");

		await service.revoke(issueValue.refreshToken);

		expect(revokedHashes).toHaveLength(1);
		expect(revokedHashes[0]).toBe(hashToken(issueValue.refreshToken));
	});
});
