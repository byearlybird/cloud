import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { type User, users } from "@/db/schema";
import { Result } from "@/shared/result";

export type UserRepo = {
	getByEmail: (email: string) => Promise<Result<User | null>>;
	create: (
		email: string,
		hashedPassword: string,
		encryptedMasterKey: string,
	) => Promise<Result<User>>;
};

export function createUserRepo(db: Database): UserRepo {
	return {
		getByEmail(email) {
			return Result.wrapAsync(async () => {
				const user = await db
					.select()
					.from(users)
					.where(eq(users.email, email))
					.limit(1)
					.then((r) => r.at(0));

				return user ?? null;
			});
		},
		create(email, hashedPassword, encryptedMasterKey) {
			return Result.wrapAsync(async () => {
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
			});
		},
	};
}
