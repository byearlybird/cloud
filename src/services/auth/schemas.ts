import { z } from "zod";

/**
 * Authentication Schemas
 */

const userBaseSchema = z.object({
	id: z.uuid(),
	email: z.email(),
	encryptedMasterKey: z.string(),
	createdAt: z.iso.datetime(),
});

/**
 * Internal user schema with hashed password and encrypted master key
 */
export const userSchema = userBaseSchema.extend({
	hashedPassword: z.string(),
});

/**
 * Schema for creating new users
 */
export const newUserSchema = userBaseSchema
	.omit({ id: true, createdAt: true })
	.extend({
		id: z.uuid().default(() => crypto.randomUUID()),
		password: z.string().min(8),
		createdAt: z
			.iso.datetime()
			.default(() => new Date().toISOString()),
	});

/**
 * Schema for user sign-in
 */
export const signInSchema = newUserSchema.pick({
	email: true,
	password: true,
});

/**
 * Schema for refresh token request
 */
export const refreshTokenSchema = z.object({
	refreshToken: z.string(),
});

export type User = z.infer<typeof userSchema>;
