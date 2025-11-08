import { sign } from "hono/jwt";
import { Err, Ok, type Result } from "ts-results";
import { prefixStorage, type Storage } from "unstorage";
import {
	newUserSchema,
	signInSchema,
	userSchema,
	type User,
} from "../schemas";

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

	async generateToken(user: Omit<User, "hashedPassword">): Promise<string> {
		const payload = {
			sub: user.id, // Standard JWT claim for user identifier
			email: user.email,
			exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
		};

		return await sign(payload, this.#jwtSecret);
	}
}
