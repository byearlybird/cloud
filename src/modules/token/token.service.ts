import type { TokenRepo } from "@/modules/token/token.repo";
import { Result } from "@/shared/result";

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
	) => Promise<
		Result<{
			accessToken: string;
			refreshToken: string;
		}>
	>;
	refresh: (
		refreshToken: string,
	) => Promise<Result<{ accessToken: string; refreshToken: string }>>;
	revoke: (refreshToken: string) => Promise<Result<void>>;
};

export function createTokenService(
	tokenRepo: TokenRepo,
	config: TokenConfig,
): TokenService {
	return {
		async issueTokens(userId, email) {
			return Result.wrapAsync(async () => {
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
				const tokenResult = await tokenRepo.create(userId, tokenHash);

				if (!tokenResult.ok) {
					throw tokenResult.error;
				}

				return { accessToken, refreshToken };
			});
		},

		async refresh(refreshToken) {
			return Result.wrapAsync(async () => {
				// Verify JWT signature and extract payload
				const verifyResult = await verifyRefreshToken(
					refreshToken,
					config.refreshTokenSecret,
				);

				if (!verifyResult.ok) {
					throw new Error("Invalid token");
				}

				const { sub: userId, email } = verifyResult.value;

				// Hash token and lookup in database
				const tokenHash = hashToken(refreshToken);
				const tokenResult = await tokenRepo.getByHash(tokenHash);

				if (!tokenResult.ok) {
					throw tokenResult.error;
				}

				if (!tokenResult.value) {
					throw new Error("Invalid token");
				}

				const tokenRecord = tokenResult.value;

				// Check if token is revoked
				if (tokenRecord.revokedAt !== null) {
					throw new Error("Token has been revoked");
				}

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
				const createResult = await tokenRepo.create(userId, newTokenHash);

				if (!createResult.ok) {
					throw createResult.error;
				}

				// Revoke the old refresh token
				const revokeResult = await tokenRepo.revoke(tokenHash);

				if (!revokeResult.ok) {
					throw revokeResult.error;
				}

				return { accessToken, refreshToken: newRefreshToken };
			});
		},

		async revoke(refreshToken) {
			return Result.wrapAsync(async () => {
				// Hash token and revoke
				const tokenHash = hashToken(refreshToken);
				const revokeResult = await tokenRepo.revoke(tokenHash);

				if (!revokeResult.ok) {
					throw revokeResult.error;
				}
			});
		},
	};
}
