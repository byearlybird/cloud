import { db } from "./db";
import type { User } from "./db/schema";

export const authRepo = {
  findByEmail: async (email: string): Promise<User | undefined> => {
    return db
      .selectFrom("users")
      .where("email", "=", email)
      .selectAll()
      .executeTakeFirst();
  },
  create: async (
    id: string,
    email: string,
    hashedPassword: string,
  ): Promise<User> => {
    const now = new Date().toISOString();
    const user: User = {
      id,
      email,
      hashed_password: hashedPassword,
      created_at: now,
      updated_at: now,
    };
    await db.insertInto("users").values(user).execute();
    return user;
  },
};

export type AuthRepo = typeof authRepo;
