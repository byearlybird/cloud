import { z } from "zod";
import { newUserSchema } from "../../db/schema";

/**
 * Authentication Schemas
 *
 * These schemas are built on top of the database schemas from src/db/schema.ts
 * and adapted for API input validation.
 */

/**
 * API input schema for sign-up
 * Based on DB newUserSchema but uses 'password' instead of 'hashedPassword'
 */
export const signUpSchema = newUserSchema
	.omit({ hashedPassword: true, createdAt: true, updatedAt: true })
	.extend({
		email: z.email(),
		password: z.string().min(8),
	});

/**
 * API input schema for sign-in
 */
export const signInSchema = z.object({
	email: z.email(),
	password: z.string().min(8),
});

/**
 * API request schema for refresh token endpoints
 * (Not related to DB refreshTokenSchema which is the DB entity)
 */
export const refreshTokenInput = z.object({
	refreshToken: z.string(),
});
