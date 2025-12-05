import { eq } from "drizzle-orm";
import { Err, Ok, type Result } from "ts-results";
import type { db } from "../../db";
import { type User, users } from "../../db/schema";
import { signUpSchema } from "./schemas";
import { TokenService } from "./token";

export class AuthService {
	#db: typeof db;
	#tokenService: TokenService;

	constructor(
		database: typeof db,
		accessTokenSecret: string,
		refreshTokenSecret: string,
		accessTokenExpiry: number,
		refreshTokenExpiry: number,
	) {
		this.#db = database;
		this.#tokenService = new TokenService(
			database,
			accessTokenSecret,
			refreshTokenSecret,
			accessTokenExpiry,
			refreshTokenExpiry,
		);
	}

	async signUp(
		email: string,
		password: string,
		encryptedMasterKey: string,
	): Promise<
		Result<Omit<User, "hashedPassword">, "already_exists" | "invalid_data">
	> {
		const { success: newUserSuccess, data: newUser } = signUpSchema.safeParse({
			email,
			password,
			encryptedMasterKey,
		});

		if (!newUserSuccess) {
			return Err("invalid_data");
		}

		// Check if user already exists
		const existingUser = await this.#db
			.select()
			.from(users)
			.where(eq(users.email, newUser.email))
			.limit(1)
			.then((r) => r.at(0));

		if (existingUser) {
			return Err("already_exists");
		}

		const hashedPassword = await Bun.password.hash(newUser.password);

		try {
			const insertedUser = await this.#db
				.insert(users)
				.values({
					id: newUser.id,
					email: newUser.email,
					hashedPassword,
					encryptedMasterKey: newUser.encryptedMasterKey,
				})
				.returning()
				.then((r) => r.at(0));

			if (!insertedUser) {
				throw new Error("Failed to insert user");
			}

			const { hashedPassword: _, ...userWithoutPassword } = insertedUser;
			return Ok(userWithoutPassword);
		} catch (error) {
			// Handle unique constraint violation (race condition)
			if (
				error instanceof Error &&
				error.message.includes("UNIQUE constraint")
			) {
				return Err("already_exists");
			}
			throw error;
		}
	}

	async signIn(
		email: string,
		password: string,
	): Promise<
		Result<
			{
				user: Omit<User, "hashedPassword">;
				accessToken: string;
				refreshToken: string;
			},
			"invalid_credentials" | "user_not_found"
		>
	> {
		const user = await this.#db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1)
			.then((r) => r.at(0));

		if (!user) {
			return Err("user_not_found");
		}

		const isPasswordValid = await Bun.password.verify(
			password,
			user.hashedPassword,
		);

		if (!isPasswordValid) {
			return Err("invalid_credentials");
		}

		// Strip hashedPassword to maintain API compatibility
		const { hashedPassword: _, ...userWithoutPassword } = user;

		// Generate tokens after successful authentication
		const accessToken =
			await this.#tokenService.generateAccessToken(userWithoutPassword);
		const refreshToken =
			await this.#tokenService.generateRefreshToken(userWithoutPassword);

		return Ok({ user: userWithoutPassword, accessToken, refreshToken });
	}

	async refreshAccessToken(
		refreshToken: string,
	): Promise<
		Result<{ accessToken: string; refreshToken: string }, "invalid_token">
	> {
		// Verify the refresh token
		const verifyResult =
			await this.#tokenService.verifyRefreshToken(refreshToken);

		if (!verifyResult.ok) {
			return Err("invalid_token");
		}

		const { sub, email } = verifyResult.val;

		// Revoke the old refresh token
		await this.#tokenService.revokeRefreshToken(refreshToken);

		// Generate new tokens (token rotation)
		const accessToken = await this.#tokenService.generateAccessToken({
			id: sub,
			email,
		});
		const newRefreshToken = await this.#tokenService.generateRefreshToken({
			id: sub,
			email,
		});

		return Ok({ accessToken, refreshToken: newRefreshToken });
	}

	async signout(refreshToken: string): Promise<void> {
		await this.#tokenService.revokeRefreshToken(refreshToken);
	}
}
