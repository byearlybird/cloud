import { sign, verify } from "hono/jwt";
import { Err, Ok, type Result } from "ts-results";
import { prefixStorage, type Storage } from "unstorage";
import { newUserSchema, type User } from "../schemas";

export class AuthService {
	#storage: Storage<User>;
	#accessTokenSecret: string;
	#refreshTokenSecret: string;

	constructor(
		storage: Storage,
		accessTokenSecret: string,
		refreshTokenSecret: string,
	) {
		this.#storage = prefixStorage<User>(storage, "auth");
		this.#accessTokenSecret = accessTokenSecret;
		this.#refreshTokenSecret = refreshTokenSecret;
	}

	async register(
		email: string,
		password: string,
	): Promise<
		Result<Omit<User, "hashedPassword">, "already_exists" | "invalid_data">
	> {
		const { success: newUserSuccess, data: newUser } = newUserSchema.safeParse({
			email,
			password,
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
		};

		await this.#storage.set(user.email, user);

		return Ok(user);
	}

	async signIn(
		email: string,
		password: string,
	): Promise<
		Result<
			Omit<User, "hashedPassword">,
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
		return Ok(userWithoutPassword);
	}

	async generateAccessToken(user: { id: string; email: string }): Promise<string> {
		const payload = {
			sub: user.id, // Standard JWT claim for user identifier
			email: user.email,
			exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15 minutes
		};

		return await sign(payload, this.#accessTokenSecret);
	}

	async generateRefreshToken(user: { id: string; email: string }): Promise<string> {
		const payload = {
			sub: user.id, // Standard JWT claim for user identifier
			email: user.email,
			exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
		};

		return await sign(payload, this.#refreshTokenSecret);
	}

	async verifyRefreshToken(
		token: string,
	): Promise<Result<{ sub: string; email: string }, "invalid_token">> {
		try {
			const payload = await verify(token, this.#refreshTokenSecret);
			return Ok({ sub: payload.sub as string, email: payload.email as string });
		} catch {
			return Err("invalid_token");
		}
	}

	getAccessTokenSecret(): string {
		return this.#accessTokenSecret;
	}
}
