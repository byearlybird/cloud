import z from "zod";

/**
 * Access token schema
 * Short-lived token for API authentication
 */
export const accessTokenSchema = z.object({
	sub: z.uuid(),
	email: z.email(),
	exp: z.number().int().positive(),
});

/**
 * Refresh token schema
 * Long-lived token for obtaining new access tokens
 */
export const refreshTokenSchema = accessTokenSchema.extend({
	jti: z.uuid(),
});

export type AccessToken = z.infer<typeof accessTokenSchema>;
export type RefreshToken = z.infer<typeof refreshTokenSchema>;
