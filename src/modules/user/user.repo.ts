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
			const user = await db
				.select()
				.from(users)
				.where(eq(users.email, email))
				.limit(1)
				.then((r) => r.at(0));

			return user ?? null;
		},
		async create(email, hashedPassword, encryptedMasterKey) {
			const user = await db
				.insert(users)
				.values({
					email,
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
