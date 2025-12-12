import type { TokenRepo } from "@/modules/token/token.repo";
import { InvalidTokenError } from "@/shared/errors";

import {
	generateAccessToken,
	generateRefreshToken,
	hashToken,
	verifyRefreshToken,
} from "./token.domain";
import type { TokenConfig } from "./token.schema";

export type TokenService = {
	issueTokens: (
		userId: string,
		email: string,
	) => Promise<{
		accessToken: string;
		refreshToken: string;
	}>;
	refresh: (
		refreshToken: string,
	) => Promise<{ accessToken: string; refreshToken: string }>;
	revoke: (refreshToken: string) => Promise<void>;
};

export function createTokenService(
	tokenRepo: TokenRepo,
	config: TokenConfig,
): TokenService {
	return {
		async issueTokens(userId, email) {
			const accessToken = await generateAccessToken(
				userId,
				email,
				config.accessTokenSecret,
				config.accessTokenExpiry,
			);

			const refreshToken = await generateRefreshToken(
				userId,
				email,
				config.refreshTokenSecret,
				config.refreshTokenExpiry,
			);

			const tokenHash = hashToken(refreshToken);
			await tokenRepo.create(userId, tokenHash);

			return { accessToken, refreshToken };
		},

		async refresh(refreshToken) {
			// Verify JWT signature and extract payload
			const { sub: userId, email } = await verifyRefreshToken(
				refreshToken,
				config.refreshTokenSecret,
			);

			// Hash token and lookup in database
			const tokenHash = hashToken(refreshToken);
			const tokenRecord = await tokenRepo.getByHash(tokenHash);

			if (!tokenRecord) {
				throw new InvalidTokenError("Invalid token");
			}

			// Check if token is revoked
			if (tokenRecord.revokedAt !== null) {
				throw new InvalidTokenError("Token has been revoked");
			}

			// Update last used timestamp
			await tokenRepo.updateLastUsed(tokenRecord.id);

			// Generate new access token
			const accessToken = await generateAccessToken(
				userId,
				email,
				config.accessTokenSecret,
				config.accessTokenExpiry,
			);

			// Generate new refresh token
			const newRefreshToken = await generateRefreshToken(
				userId,
				email,
				config.refreshTokenSecret,
				config.refreshTokenExpiry,
			);

			// Store the new refresh token
			const newTokenHash = hashToken(newRefreshToken);
			await tokenRepo.create(userId, newTokenHash);

			// Revoke the old refresh token
			await tokenRepo.revoke(tokenHash);

			return { accessToken, refreshToken: newRefreshToken };
		},

		async revoke(refreshToken) {
			// Hash token and revoke
			const tokenHash = hashToken(refreshToken);
			await tokenRepo.revoke(tokenHash);
		},
	};
}
