import { decode, sign, verify } from "hono/jwt";

import { Result } from "@/shared/result";
import { type AccessToken, accessTokenSchema } from "./token.schema";

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

export async function verifyToken(
	token: string,
	secret: string,
): Promise<Result<AccessToken>> {
	return Result.wrapAsync(async () => {
		const payload = await verify(token, secret);
		return accessTokenSchema.parse(payload);
	});
}

export function decodeToken(token: string): Result<AccessToken> {
	return Result.wrap(() => {
		const { payload } = decode(token);
		return accessTokenSchema.parse(payload);
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
