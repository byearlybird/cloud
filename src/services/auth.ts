import { Err, Ok, type Result } from "ts-results";
import { prefixStorage, type Storage } from "unstorage";
import { sign, verify } from "hono/jwt";

import z from "zod";

const userSchema = z.object({
	id: z.uuid(),
	email: z.email(),
	hashedPassword: z.string(),
	createdAt: z.iso.datetime(),
});

export type User = z.infer<typeof userSchema>;

export const newUserSchema = z.object({
	id: z.uuid().default(() => crypto.randomUUID()),
	email: z.email(),
	password: z.string().min(8),
	createdAt: z.iso.datetime().default(() => new Date().toISOString()),
});

export const signInSchema = z.object({
	email: z.email(),
	password: z.string(),
});

export type TokenPayload = {
	id: string;
	email: string;
	exp: number;
};

export class AuthService {
	#storage: Storage<User>;
	#jwtSecret: string;

	constructor(storage: Storage, jwtSecret: string) {
		this.#storage = prefixStorage<User>(storage, "auth");
		this.#jwtSecret = jwtSecret;
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
		Result<Omit<User, "hashedPassword">, "invalid_credentials" | "user_not_found">
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

	async generateToken(user: Omit<User, "hashedPassword">): Promise<string> {
		const payload: TokenPayload = {
			id: user.id,
			email: user.email,
			exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
		};

		return await sign(payload, this.#jwtSecret);
	}

	async validateToken(
		token: string,
	): Promise<Result<TokenPayload, "invalid_token" | "expired_token">> {
		try {
			const payload = await verify(token, this.#jwtSecret);

			// Check if token is expired
			const now = Math.floor(Date.now() / 1000);
			if (payload.exp && payload.exp < now) {
				return Err("expired_token");
			}

			// Validate payload structure
			if (
				typeof payload.id !== "string" ||
				typeof payload.email !== "string" ||
				typeof payload.exp !== "number"
			) {
				return Err("invalid_token");
			}

			return Ok(payload as TokenPayload);
		} catch (_error) {
			return Err("invalid_token");
		}
	}
}
