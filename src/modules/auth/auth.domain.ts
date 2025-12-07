import type { User } from "@/db/schema";

/**
 * Remove sensitive fields from user object before returning to client
 */
export function sanitizeUser(user: User): Omit<User, "hashedPassword"> {
	const { hashedPassword: _, ...sanitized } = user;
	return sanitized;
}

/**
 * Hash a password using Bun's native password hashing
 */
export async function hashPassword(password: string): Promise<string> {
	return await Bun.password.hash(password);
}
