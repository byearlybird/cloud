import { env } from "@/env";
import { createAuthService } from "@/modules/auth/auth.service";
import { createBlobService } from "@/modules/blob/blob.service";
import type { TokenConfig } from "@/modules/token/token.schema";
import { createTokenService } from "@/modules/token/token.service";
import { blobRepo, tokenRepo, userRepo } from "./app.repos";

const tokenConfig: TokenConfig = {
	accessTokenSecret: env.ACCESS_TOKEN_SECRET,
	refreshTokenSecret: env.REFRESH_TOKEN_SECRET,
	accessTokenExpiry: env.ACCESS_TOKEN_EXPIRY,
	refreshTokenExpiry: env.REFRESH_TOKEN_EXPIRY,
};

export const blobService = createBlobService(blobRepo);
export const tokenService = createTokenService(tokenRepo, tokenConfig);
export const authService = createAuthService(userRepo, tokenService);
