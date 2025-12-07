import { describe, expect, test } from "bun:test";

import type { RefreshTokenRow } from "@/db/schema";
import { Result } from "@/shared/result";

import { hashToken } from "./token.domain";
import type { TokenRepo } from "./token.repo";
import type { TokenConfig } from "./token.schema";
import { createTokenService } from "./token.service";

const config: TokenConfig = {
	accessTokenSecret: "access-secret",
	refreshTokenSecret: "refresh-secret",
	accessTokenExpiry: 60,
	refreshTokenExpiry: 120,
};

function buildRow(overrides: Partial<RefreshTokenRow> = {}): RefreshTokenRow {
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
				return Result.ok(buildRow({ userId, tokenHash }));
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
		const result = await service.issueTokens(userId, "user@example.com");

		expect(result.ok).toBe(true);
		expect(result.value.accessToken.length).toBeGreaterThan(0);
		expect(result.value.refreshToken.length).toBeGreaterThan(0);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.userId).toBe(userId);
		const storedHash = calls[0]?.tokenHash;
		expect(storedHash).toBe(hashToken(result.value.refreshToken));
	});

	test("refresh validates the token and updates last used timestamps", async () => {
		const storedRows = new Map<string, RefreshTokenRow>();
		let updateCount = 0;

		const repo: TokenRepo = {
			async create(userId, tokenHash) {
				const row = buildRow({ userId, tokenHash });
				storedRows.set(tokenHash, row);
				return Result.ok(row);
			},
			async getByHash(tokenHash) {
				return Result.ok(storedRows.get(tokenHash) ?? null);
			},
			async updateLastUsed(id) {
				for (const row of storedRows.values()) {
					if (row.id === id) {
						updateCount += 1;
						return Result.ok<void>(undefined);
					}
				}
				return Result.err(new Error("token missing"));
			},
			async revoke(tokenHash) {
				const row = storedRows.get(tokenHash);
				if (row) {
					storedRows.set(tokenHash, {
						...row,
						revokedAt: new Date().toISOString(),
					});
				}
				return Result.ok<void>(undefined);
			},
		};

		const service = createTokenService(repo, config);
		const userId = crypto.randomUUID();
		const issueResult = await service.issueTokens(userId, "user@example.com");
		if (!issueResult.ok) {
			throw issueResult.error;
		}

		const refreshResult = await service.refresh(issueResult.value.refreshToken);

		expect(refreshResult.ok).toBe(true);
		expect(refreshResult.value.accessToken.length).toBeGreaterThan(0);
		expect(updateCount).toBe(1);
	});

	test("revoke hashes the token before calling the repository", async () => {
		const revokedHashes: string[] = [];
		const repo: TokenRepo = {
			async create(userId, tokenHash) {
				return Result.ok(buildRow({ userId, tokenHash }));
			},
			async getByHash() {
				return Result.ok(null);
			},
			async updateLastUsed() {
				return Result.ok<void>(undefined);
			},
			async revoke(tokenHash) {
				revokedHashes.push(tokenHash);
				return Result.ok<void>(undefined);
			},
		};

		const service = createTokenService(repo, config);
		const userId = crypto.randomUUID();
		const issueResult = await service.issueTokens(userId, "user@example.com");
		if (!issueResult.ok) {
			throw issueResult.error;
		}

		await service.revoke(issueResult.value.refreshToken);

		expect(revokedHashes).toHaveLength(1);
		expect(revokedHashes[0]).toBe(hashToken(issueResult.value.refreshToken));
	});
});
