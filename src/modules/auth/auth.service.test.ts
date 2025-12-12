import { describe, expect, test } from "bun:test";

import type { User } from "@/db/schema";
import { ConflictError, UnauthorizedError } from "@/shared/errors";

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
				return null;
			},
			async create(email, hashedPassword, encryptedMasterKey) {
				savedHashedPassword = hashedPassword;
				return buildUser({ email, hashedPassword, encryptedMasterKey });
			},
		};

		const tokenService: TokenService = {
			async issueTokens(userId, email) {
				issuedTokensFor = { userId, email };
				return {
					accessToken: "access-token",
					refreshToken: "refresh-token",
				};
			},
			async refresh() {
				throw new Error("not implemented");
			},
			async revoke() {
				throw new Error("not implemented");
			},
		};

		const service = createAuthService(userRepo, tokenService);
		const dto = {
			email: "new-user@example.com",
			password: "Supersafe1",
			encryptedMasterKey: "master-key",
		};

		const value = await service.signUp(dto);

		expect(value.user.email).toBe(dto.email);
		expect("hashedPassword" in (value.user as Record<string, unknown>)).toBe(
			false,
		);
		expect(value.accessToken).toBe("access-token");
		expect(value.refreshToken).toBe("refresh-token");
		expect(savedHashedPassword).not.toBeNull();
		expect(savedHashedPassword).not.toBe(dto.password);
		expect(issuedTokensFor).toBeTruthy();
		expect(
			(issuedTokensFor as unknown as { userId: string; email: string }).email,
		).toBe(dto.email);
	});

	test("signUp fails when the email already exists", async () => {
		const existingUser = buildUser();
		const userRepo: UserRepo = {
			async getByEmail() {
				return existingUser;
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
				throw new Error("not implemented");
			},
			async revoke() {
				throw new Error("not implemented");
			},
		};

		const service = createAuthService(userRepo, tokenService);
		const dto = {
			email: existingUser.email,
			password: "Supersafe1",
			encryptedMasterKey: "master-key",
		};

		await expect(service.signUp(dto)).rejects.toThrow(ConflictError);
	});

	test("signIn verifies the password and issues tokens", async () => {
		const password = "CorrectHorseBatteryStaple";
		const hashedPassword = await Bun.password.hash(password);
		const existingUser = buildUser({ hashedPassword });
		let issueCount = 0;

		const userRepo: UserRepo = {
			async getByEmail() {
				return existingUser;
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
				return {
					accessToken: "issued-access",
					refreshToken: "issued-refresh",
				};
			},
			async refresh() {
				throw new Error("not implemented");
			},
			async revoke() {
				throw new Error("not implemented");
			},
		};

		const service = createAuthService(userRepo, tokenService);
		const value = await service.signIn({
			email: existingUser.email,
			password,
		});

		expect(value.accessToken).toBe("issued-access");
		expect(value.refreshToken).toBe("issued-refresh");
		expect(issueCount).toBe(1);
		expect("hashedPassword" in (value.user as Record<string, unknown>)).toBe(
			false,
		);
	});

	test("signIn rejects invalid passwords", async () => {
		const hashedPassword = await Bun.password.hash("correct-password");
		const existingUser = buildUser({ hashedPassword });
		let issueCount = 0;

		const userRepo: UserRepo = {
			async getByEmail() {
				return existingUser;
			},
			async create() {
				throw new Error("create should not be called");
			},
		};

		const tokenService: TokenService = {
			async issueTokens() {
				issueCount += 1;
				return {
					accessToken: "access",
					refreshToken: "refresh",
				};
			},
			async refresh() {
				throw new Error("not implemented");
			},
			async revoke() {
				throw new Error("not implemented");
			},
		};

		const service = createAuthService(userRepo, tokenService);

		await expect(
			service.signIn({
				email: existingUser.email,
				password: "wrong-password",
			}),
		).rejects.toThrow(UnauthorizedError);
		expect(issueCount).toBe(0);
	});
});
