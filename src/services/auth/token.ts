import { and, eq } from "drizzle-orm";
import { decode, sign, verify } from "hono/jwt";
import { Err, Ok, type Result } from "ts-results";
import type { db } from "../../db";
import { refreshTokens } from "../../db/schema";

export class TokenService {
	#db: typeof db;
	#accessTokenSecret: string;
	#refreshTokenSecret: string;
	#accessTokenExpiry: number;
	#refreshTokenExpiry: number;

	constructor(
		database: typeof db,
		accessTokenSecret: string,
		refreshTokenSecret: string,
		accessTokenExpiry: number,
		refreshTokenExpiry: number,
	) {
		this.#db = database;
		this.#accessTokenSecret = accessTokenSecret;
		this.#refreshTokenSecret = refreshTokenSecret;
		this.#accessTokenExpiry = accessTokenExpiry;
		this.#refreshTokenExpiry = refreshTokenExpiry;
	}

	async generateAccessToken(user: {
		id: string;
		email: string;
	}): Promise<string> {
		const payload = {
			sub: user.id, // Standard JWT claim for user identifier
			email: user.email,
			exp: Math.floor(Date.now() / 1000) + this.#accessTokenExpiry,
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
			jti: crypto.randomUUID(), // Unique token ID to prevent duplicate tokens
			exp: Math.floor(Date.now() / 1000) + this.#refreshTokenExpiry,
		};

		const token = await sign(payload, this.#refreshTokenSecret);

		// Store token in database
		const tokenHash = Bun.hash(token).toString();
		await this.#db.insert(refreshTokens).values({
			userId: user.id,
			tokenHash,
			lastUsedAt: new Date().toISOString(),
		});

		return token;
	}

	async verifyRefreshToken(
		token: string,
	): Promise<Result<{ sub: string; email: string }, "invalid_token">> {
		try {
			// Verify JWT signature and expiry
			const payload = await verify(token, this.#refreshTokenSecret);
			const userId = payload.sub as string;

			// Check if token exists and is not revoked
			const tokenHash = Bun.hash(token).toString();
			const storedToken = await this.#db
				.select()
				.from(refreshTokens)
				.where(
					and(
						eq(refreshTokens.userId, userId),
						eq(refreshTokens.tokenHash, tokenHash),
					),
				)
				.limit(1)
				.then((r) => r.at(0));

			// Token must exist and not be revoked
			if (!storedToken || storedToken.revokedAt !== null) {
				return Err("invalid_token");
			}

			// Update last used timestamp
			await this.#db
				.update(refreshTokens)
				.set({ lastUsedAt: new Date().toISOString() })
				.where(eq(refreshTokens.id, storedToken.id));

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

			const tokenHash = Bun.hash(token).toString();

			// Mark token as revoked
			await this.#db
				.update(refreshTokens)
				.set({ revokedAt: new Date().toISOString() })
				.where(
					and(
						eq(refreshTokens.userId, userId),
						eq(refreshTokens.tokenHash, tokenHash),
					),
				);
		} catch {
			// Silently fail if token is malformed
		}
	}
}
