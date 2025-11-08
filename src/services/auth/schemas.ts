import { z } from "zod";

/**
 * Authentication Schemas
 */

/**
 * Internal user schema with hashed password
 */
export const userSchema = z.object({
	id: z.uuid(),
	email: z.email(),
	hashedPassword: z.string(),
	createdAt: z.iso.datetime(),
});

/**
 * Schema for creating new users
 */
export const newUserSchema = z.object({
	id: z.uuid().default(() => crypto.randomUUID()),
	email: z.email(),
	password: z.string().min(8),
	createdAt: z.iso.datetime().default(() => new Date().toISOString()),
});

/**
 * Schema for user sign-in
 */
export const signInSchema = z.object({
	email: z.email(),
	password: z.string(),
});

/**
 * Schema for refresh token request
 */
export const refreshTokenSchema = z.object({
	refreshToken: z.string(),
});

export type User = z.infer<typeof userSchema>;
