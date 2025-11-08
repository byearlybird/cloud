import { decode, sign, verify } from "hono/jwt";
import { Err, Ok, type Result } from "ts-results";
import { prefixStorage, type Storage } from "unstorage";

// Token expiry constants
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

export class TokenService {
	#storage: Storage<string>;
	#accessTokenSecret: string;
	#refreshTokenSecret: string;

	constructor(
		storage: Storage,
		accessTokenSecret: string,
		refreshTokenSecret: string,
	) {
		this.#storage = prefixStorage<string>(storage, "token");
		this.#accessTokenSecret = accessTokenSecret;
		this.#refreshTokenSecret = refreshTokenSecret;
	}

	async generateAccessToken(user: {
		id: string;
		email: string;
	}): Promise<string> {
		const payload = {
			sub: user.id, // Standard JWT claim for user identifier
			email: user.email,
			exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY,
		};

		return await sign(payload, this.#accessTokenSecret);
	}

	async generateRefreshToken(user: {
		id: string;
		email: string;
	}): Promise<string> {
		const payload = {
			sub: user.id, // Standard JWT claim for user identifier
			email: user.email,
			exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRY,
		};

		return await sign(payload, this.#refreshTokenSecret);
	}

	async verifyRefreshToken(
		token: string,
	): Promise<Result<{ sub: string; email: string }, "invalid_token">> {
		try {
			// Decode token to get userId without verification (needed for revocation key)
			const payload = await verify(token, this.#refreshTokenSecret);
			const userId = payload.sub as string;

			// Check if token is revoked using userId:hash key
			const revocationKey = this.#makeKey(userId, token);
			const revokation = await this.#storage.get(revocationKey);

			if (revokation) {
				return Err("invalid_token");
			}

			return Ok({ sub: userId, email: payload.email as string });
		} catch {
			return Err("invalid_token");
		}
	}

	async revokeRefreshToken(token: string): Promise<void> {
		try {
			// Decode token to get userId (don't verify as it may already be expired/invalid)
			const { payload } = decode(token);
			const userId = payload.sub as string;

			if (!userId) return;

			const revocationKey = this.#makeKey(userId, token);
			const revokedAt = new Date().toISOString();
			await this.#storage.set(revocationKey, revokedAt);
		} catch {
			// Silently fail if token is malformed
		}
	}

	#makeKey(userId: string, token: string): string {
		const tokenHash = Bun.hash(token).toString();
		return `${userId}:${tokenHash}`;
	}
}
