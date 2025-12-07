import { describe, expect, test } from "bun:test";

import type { User } from "@/db/schema";
import { Result } from "@/shared/result";

import type { TokenService } from "../token/token.service";
import type { UserRepo } from "../user/user.repo";
import { createAuthService } from "./auth.service";

function buildUser(overrides: Partial<User> = {}): User {
	const now = new Date().toISOString();
	return {
		id: overrides.id ?? crypto.randomUUID(),
		email: overrides.email ?? "user@example.com",
		hashedPassword: overrides.hashedPassword ?? "hashed",
		encryptedMasterKey: overrides.encryptedMasterKey ?? "encrypted-master-key",
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	};
}

describe("auth.service", () => {
	test("signUp creates a new user and returns sanitized data", async () => {
		let savedHashedPassword: string | null = null;
		let issuedTokensFor: { userId: string; email: string } | null = null;

		const userRepo: UserRepo = {
			async getByEmail() {
				return Result.ok<User | null>(null);
			},
			async create(email, hashedPassword, encryptedMasterKey) {
				savedHashedPassword = hashedPassword;
				return Result.ok(
					buildUser({ email, hashedPassword, encryptedMasterKey }),
				);
			},
		};

		const tokenService: TokenService = {
			async issueTokens(userId, email) {
				issuedTokensFor = { userId, email };
				return Result.ok({
					accessToken: "access-token",
					refreshToken: "refresh-token",
				});
			},
			async refresh() {
				return Result.err(new Error("not implemented"));
			},
			async revoke() {
				return Result.err(new Error("not implemented"));
			},
		};

		const service = createAuthService(userRepo, tokenService);
		const dto = {
			email: "new-user@example.com",
			password: "Supersafe1",
			encryptedMasterKey: "master-key",
		};

		const result = await service.signUp(dto);

		expect(result.ok).toBe(true);
		expect(result.value.user.email).toBe(dto.email);
		expect(
			"hashedPassword" in (result.value.user as Record<string, unknown>),
		).toBe(false);
		expect(result.value.accessToken).toBe("access-token");
		expect(result.value.refreshToken).toBe("refresh-token");
		expect(savedHashedPassword).not.toBeNull();
		expect(savedHashedPassword).not.toBe(dto.password);
		expect(issuedTokensFor?.email).toBe(dto.email);
	});

	test("signUp fails when the email already exists", async () => {
		const existingUser = buildUser();
		const userRepo: UserRepo = {
			async getByEmail() {
				return Result.ok<User | null>(existingUser);
			},
			async create() {
				throw new Error("create should not be called");
			},
		};

		const tokenService: TokenService = {
			async issueTokens() {
				throw new Error("issueTokens should not be called");
			},
			async refresh() {
				return Result.err(new Error("not implemented"));
			},
			async revoke() {
				return Result.err(new Error("not implemented"));
			},
		};

		const service = createAuthService(userRepo, tokenService);
		const dto = {
			email: existingUser.email,
			password: "Supersafe1",
			encryptedMasterKey: "master-key",
		};

		const result = await service.signUp(dto);

		expect(result.ok).toBe(false);
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error.message).toBe("User already exists");
	});

	test("signIn verifies the password and issues tokens", async () => {
		const password = "CorrectHorseBatteryStaple";
		const hashedPassword = await Bun.password.hash(password);
		const existingUser = buildUser({ hashedPassword });
		let issueCount = 0;

		const userRepo: UserRepo = {
			async getByEmail() {
				return Result.ok<User | null>(existingUser);
			},
			async create() {
				throw new Error("create should not be called");
			},
		};

		const tokenService: TokenService = {
			async issueTokens(userId, email) {
				issueCount += 1;
				expect(userId).toBe(existingUser.id);
				expect(email).toBe(existingUser.email);
				return Result.ok({
					accessToken: "issued-access",
					refreshToken: "issued-refresh",
				});
			},
			async refresh() {
				return Result.err(new Error("not implemented"));
			},
			async revoke() {
				return Result.err(new Error("not implemented"));
			},
		};

		const service = createAuthService(userRepo, tokenService);
		const result = await service.signIn({
			email: existingUser.email,
			password,
		});

		expect(result.ok).toBe(true);
		expect(result.value.accessToken).toBe("issued-access");
		expect(result.value.refreshToken).toBe("issued-refresh");
		expect(issueCount).toBe(1);
		expect(
			"hashedPassword" in (result.value.user as Record<string, unknown>),
		).toBe(false);
	});

	test("signIn rejects invalid passwords", async () => {
		const hashedPassword = await Bun.password.hash("correct-password");
		const existingUser = buildUser({ hashedPassword });
		let issueCount = 0;

		const userRepo: UserRepo = {
			async getByEmail() {
				return Result.ok<User | null>(existingUser);
			},
			async create() {
				throw new Error("create should not be called");
			},
		};

		const tokenService: TokenService = {
			async issueTokens() {
				issueCount += 1;
				return Result.ok({
					accessToken: "access",
					refreshToken: "refresh",
				});
			},
			async refresh() {
				return Result.err(new Error("not implemented"));
			},
			async revoke() {
				return Result.err(new Error("not implemented"));
			},
		};

		const service = createAuthService(userRepo, tokenService);
		const result = await service.signIn({
			email: existingUser.email,
			password: "wrong-password",
		});

		expect(result.ok).toBe(false);
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error.message).toBe("Invalid credentials");
		expect(issueCount).toBe(0);
	});
});
