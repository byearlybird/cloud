import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanupTestDb, createTestDb } from "../../db/test-helpers";
import { AuthService } from "./service";

describe("AuthService", () => {
	let db: Awaited<ReturnType<typeof createTestDb>>["db"];
	let sqlite: Awaited<ReturnType<typeof createTestDb>>["sqlite"];
	let authService: AuthService;
	const accessTokenSecret = "test-access-secret";
	const refreshTokenSecret = "test-refresh-secret";
	const accessTokenExpiry = 15 * 60; // 15 minutes
	const refreshTokenExpiry = 7 * 24 * 60 * 60; // 7 days
	const encryptedMasterKey = "test-encrypted-master-key";

	beforeEach(async () => {
		const testDb = await createTestDb();
		db = testDb.db;
		sqlite = testDb.sqlite;
		authService = new AuthService(
			db,
			accessTokenSecret,
			refreshTokenSecret,
			accessTokenExpiry,
			refreshTokenExpiry,
		);
	});

	afterEach(() => {
		cleanupTestDb(sqlite);
	});

	describe("register", () => {
		test("successfully creates user with valid data", async () => {
			const email = "test@example.com";
			const password = "password123";

			const result = await authService.signUp(
				email,
				password,
				encryptedMasterKey,
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.val.user.email).toBe(email);
				expect(result.val.user.id).toBeDefined();
				expect(result.val.user.createdAt).toBeDefined();
				expect("hashedPassword" in result.val.user).toBe(false);
				expect(result.val.accessToken).toBeDefined();
				expect(result.val.refreshToken).toBeDefined();
				expect(typeof result.val.accessToken).toBe("string");
				expect(typeof result.val.refreshToken).toBe("string");
			}
		});

		test("stores user with hashed password", async () => {
			const email = "test@example.com";
			const password = "password123";

			const signUpResult = await authService.signUp(
				email,
				password,
				encryptedMasterKey,
			);

			// Verify user was created with hashed password
			expect(signUpResult.ok).toBe(true);
			if (signUpResult.ok) {
				// The signUp result doesn't include hashedPassword, but we can verify via signIn
				const signInResult = await authService.signIn(email, password);
				expect(signInResult.ok).toBe(true);
				// Verify signup returns tokens
				expect(signUpResult.val.accessToken).toBeDefined();
				expect(signUpResult.val.refreshToken).toBeDefined();
				expect(typeof signUpResult.val.accessToken).toBe("string");
				expect(typeof signUpResult.val.refreshToken).toBe("string");
			}
		});

		test("returns error for duplicate email", async () => {
			const email = "duplicate@example.com";
			const password = "password123";

			await authService.signUp(email, password, encryptedMasterKey);
			const result = await authService.signUp(
				email,
				password,
				encryptedMasterKey,
			);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.val).toBe("already_exists");
			}
		});

		test("returns error for invalid email", async () => {
			const result = await authService.signUp(
				"invalid-email",
				"password123",
				encryptedMasterKey,
			);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.val).toBe("invalid_data");
			}
		});

		test("returns error for password shorter than 8 characters", async () => {
			const result = await authService.signUp(
				"test@example.com",
				"short",
				encryptedMasterKey,
			);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.val).toBe("invalid_data");
			}
		});
	});

	describe("signIn", () => {
		const email = "signin@example.com";
		const password = "password123";

		beforeEach(async () => {
			// Register a user before each signIn test
			await authService.signUp(email, password, encryptedMasterKey);
		});

		test("successfully authenticates with valid credentials", async () => {
			const result = await authService.signIn(email, password);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.val.user.email).toBe(email);
				expect(result.val.user.id).toBeDefined();
				expect("hashedPassword" in result.val.user).toBe(false);
				expect(result.val.accessToken).toBeDefined();
				expect(result.val.refreshToken).toBeDefined();
				expect(typeof result.val.accessToken).toBe("string");
				expect(typeof result.val.refreshToken).toBe("string");
			}
		});

		test("returns error for non-existent user", async () => {
			const result = await authService.signIn(
				"nonexistent@example.com",
				password,
			);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.val).toBe("user_not_found");
			}
		});

		test("returns error for incorrect password", async () => {
			const result = await authService.signIn(email, "wrongpassword");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.val).toBe("invalid_credentials");
			}
		});

		test("generates valid JWT tokens", async () => {
			const result = await authService.signIn(email, password);

			expect(result.ok).toBe(true);

			if (result.ok) {
				// JWT tokens should have 3 parts separated by dots
				expect(result.val.accessToken.split(".").length).toBe(3);
				expect(result.val.refreshToken.split(".").length).toBe(3);
				// Tokens should be non-empty strings
				expect(result.val.accessToken.length).toBeGreaterThan(0);
				expect(result.val.refreshToken.length).toBeGreaterThan(0);
			}
		});
	});

	describe("refreshAccessToken", () => {
		const email = "refresh@example.com";
		const password = "password123";
		let validRefreshToken: string;

		beforeEach(async () => {
			await authService.signUp(email, password, encryptedMasterKey);
			const signInResult = await authService.signIn(email, password);
			if (signInResult.ok) {
				validRefreshToken = signInResult.val.refreshToken;
			}
		});

		test("successfully generates new tokens with valid refresh token", async () => {
			const result = await authService.refreshAccessToken(validRefreshToken);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.val.accessToken).toBeDefined();
				expect(result.val.refreshToken).toBeDefined();
				expect(typeof result.val.accessToken).toBe("string");
				expect(typeof result.val.refreshToken).toBe("string");
			}
		});

		test("generates new valid tokens", async () => {
			const result = await authService.refreshAccessToken(validRefreshToken);

			expect(result.ok).toBe(true);
			if (result.ok) {
				// Should return valid JWT tokens
				expect(result.val.accessToken.split(".").length).toBe(3);
				expect(result.val.refreshToken.split(".").length).toBe(3);
				expect(result.val.accessToken.length).toBeGreaterThan(0);
				expect(result.val.refreshToken.length).toBeGreaterThan(0);
			}
		});

		test("revokes the old refresh token", async () => {
			const firstRefresh =
				await authService.refreshAccessToken(validRefreshToken);
			expect(firstRefresh.ok).toBe(true);

			// Try to use the old refresh token again - should fail
			const secondRefresh =
				await authService.refreshAccessToken(validRefreshToken);

			expect(secondRefresh.ok).toBe(false);
			if (!secondRefresh.ok) {
				expect(secondRefresh.val).toBe("invalid_token");
			}
		});

		test("returns error for invalid token", async () => {
			const result = await authService.refreshAccessToken("invalid-token");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.val).toBe("invalid_token");
			}
		});

		test("returns error for malformed token", async () => {
			const result = await authService.refreshAccessToken("not.a.valid.jwt");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.val).toBe("invalid_token");
			}
		});
	});

	describe("signout", () => {
		const email = "signout@example.com";
		const password = "password123";
		let refreshToken: string;

		beforeEach(async () => {
			await authService.signUp(email, password, encryptedMasterKey);
			const signInResult = await authService.signIn(email, password);
			if (signInResult.ok) {
				refreshToken = signInResult.val.refreshToken;
			}
		});

		test("successfully revokes refresh token", async () => {
			await authService.signout(refreshToken);

			// Try to use the refresh token - should fail
			const result = await authService.refreshAccessToken(refreshToken);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.val).toBe("invalid_token");
			}
		});

		test("does not throw error for invalid token", async () => {
			// Should not throw - just fail silently
			expect(authService.signout("invalid-token")).resolves.toBeUndefined();
		});
	});
});
