import { sign, verify } from "hono/jwt";

import { Result } from "@/shared/result";
import {
	type AccessToken,
	accessTokenSchema,
	type RefreshToken,
	refreshTokenSchema,
} from "./token.schema";

export async function generateAccessToken(
	userId: string,
	email: string,
	secret: string,
	expire: number,
) {
	return await sign(
		{
			sub: userId,
			email,
			exp: Math.floor(Date.now() / 1000) + expire,
		},
		secret,
	);
}

export async function generateRefreshToken(
	userId: string,
	email: string,
	secret: string,
	expire: number,
) {
	return await sign(
		{
			sub: userId,
			email,
			jti: crypto.randomUUID(),
			exp: Math.floor(Date.now() / 1000) + expire,
		},
		secret,
	);
}

export async function verifyAccessToken(
	token: string,
	secret: string,
): Promise<Result<AccessToken>> {
	return Result.wrapAsync(async () => {
		const payload = await verify(token, secret, "HS256");
		return accessTokenSchema.parse(payload);
	});
}

export async function verifyRefreshToken(
	token: string,
	secret: string,
): Promise<Result<RefreshToken>> {
	return Result.wrapAsync(async () => {
		const payload = await verify(token, secret, "HS256");
		return refreshTokenSchema.parse(payload);
	});
}

/**
 * Hash a token using SHA-256 for secure storage
 * @param token - The token to hash
 * @returns Hexadecimal string representation of the hash
 */
export function hashToken(token: string): string {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(token);
	return hasher.digest("hex");
}
