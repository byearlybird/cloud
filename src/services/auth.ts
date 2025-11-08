import { Err, Ok, type Result } from "ts-results";
import { prefixStorage, type Storage } from "unstorage";

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

export class AuthService {
	#storage: Storage<User>;

	constructor(storage: Storage) {
		this.#storage = prefixStorage<User>(storage, "auth");
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
}
