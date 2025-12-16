import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { type User, users } from "@/db/schema";

export type UserRepo = {
	getByEmail: (email: string) => Promise<User | null>;
	create: (
		email: string,
		hashedPassword: string,
		encryptedMasterKey: string,
	) => Promise<User>;
};

export function createUserRepo(db: Database): UserRepo {
	return {
		async getByEmail(email) {
			// Normalize email to lowercase and trim whitespace for consistent lookups
			const normalizedEmail = email.trim().toLowerCase();

			const user = await db
				.select()
				.from(users)
				.where(eq(users.email, normalizedEmail))
				.limit(1)
				.then((r) => r.at(0));

			return user ?? null;
		},
		async create(email, hashedPassword, encryptedMasterKey) {
			// Normalize email to lowercase and trim whitespace to prevent duplicate accounts
			const normalizedEmail = email.trim().toLowerCase();

			const user = await db
				.insert(users)
				.values({
					email: normalizedEmail,
					hashedPassword,
					encryptedMasterKey,
				})
				.returning()
				.then((r) => r.at(0));

			if (user) {
				return user;
			}

			throw new Error("Failed to create user");
		},
	};
}
