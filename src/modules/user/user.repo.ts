import type { KV } from "@/db/kv";

export type User = {
	id: string;
	email: string;
	hashedPassword: string;
	encryptedMasterKey: string;
	createdAt: string;
	updatedAt: string;
};

export type UserRepo = {
	getByEmail: (email: string) => Promise<User | null>;
	create: (
		email: string,
		hashedPassword: string,
		encryptedMasterKey: string,
	) => Promise<User>;
};

export function createUserRepo(kv: KV): UserRepo {
	return {
		async getByEmail(email) {
			// Look up user ID by email index
			const indexEntry = await kv.get<string>([
				"users",
				"index",
				"email",
				email,
			]);
			if (!indexEntry.value) {
				return null;
			}

			// Get user data by ID
			const userEntry = await kv.get<User>(["users", "id", indexEntry.value]);
			return userEntry.value;
		},

		async create(email, hashedPassword, encryptedMasterKey) {
			const userId = crypto.randomUUID();
			const now = new Date().toISOString();

			const user: User = {
				id: userId,
				email,
				hashedPassword,
				encryptedMasterKey,
				createdAt: now,
				updatedAt: now,
			};

			await kv.transaction(async (tx) => {
				// Check if email already exists
				const existing = await tx.get(["users", "index", "email", email]);
				if (existing.value) {
					throw new Error("Email already exists");
				}

				// Set email index
				await tx.set(["users", "index", "email", email], userId);

				// Set user data
				await tx.set(["users", "id", userId], user);
			});

			return user;
		},
	};
}
