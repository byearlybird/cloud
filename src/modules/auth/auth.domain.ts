import type { User } from "@/modules/user/user.repo";

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

export async function verifyPassword(
	password: string,
	hashedPassword: string,
): Promise<boolean> {
	return await Bun.password.verify(password, hashedPassword);
}
