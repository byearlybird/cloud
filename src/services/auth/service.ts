import { Err, Ok, type Result } from "ts-results";
import { prefixStorage, type Storage } from "unstorage";
import { newUserSchema, type User } from "./schemas";
import { TokenService } from "./token";

export class AuthService {
	#storage: Storage<User>;
	#tokenService: TokenService;

	constructor(
		storage: Storage,
		accessTokenSecret: string,
		refreshTokenSecret: string,
		accessTokenExpiry: number,
		refreshTokenExpiry: number,
	) {
		this.#storage = prefixStorage<User>(storage, "auth");
		this.#tokenService = new TokenService(
			storage,
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
		const { success: newUserSuccess, data: newUser } = newUserSchema.safeParse({
			email,
			password,
			encryptedMasterKey,
		});

		if (!newUserSuccess) {
			return Err("invalid_data");
		}

		if (await this.#storage.has(newUser.email)) {
			return Err("already_exists");
		}

		const hashedPassword = await Bun.password.hash(newUser.password);

		const user = {
			id: newUser.id,
			email: newUser.email,
			createdAt: newUser.createdAt,
			hashedPassword,
			encryptedMasterKey: newUser.encryptedMasterKey,
		};

		await this.#storage.set(user.email, user);

		const { hashedPassword: _, ...userWithoutPassword } = user;
		return Ok(userWithoutPassword);
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
		const user = await this.#storage.get(email);

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
