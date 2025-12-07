import {
	generateAccessToken,
	generateRefreshToken,
	hashToken,
} from "@/modules/token/token.domain";
import type { TokenRepo } from "@/modules/token/token.repo";
import type { UserRepo } from "@/modules/user/user.repo";
import { Result } from "@/shared/result";
import { hashPassword, sanitizeUser } from "./auth.domain";
import type {
	AuthConfig,
	AuthResponse,
	SignInDTO,
	SignUpDTO,
} from "./auth.schema";
import { signInSchema, signUpSchema } from "./auth.schema";

export type AuthService = {
	signUp: (dto: SignUpDTO) => Promise<Result<AuthResponse>>;
	signIn: (dto: SignInDTO) => Promise<Result<AuthResponse>>;
};

export function createAuthService(
	userRepo: UserRepo,
	tokenRepo: TokenRepo,
	config: AuthConfig,
): AuthService {
	return {
		async signUp(dto) {
			return Result.wrapAsync(async () => {
				// Validate input
				const validated = signUpSchema.parse(dto);

				// Check if user already exists
				const existingUser = await userRepo.getByEmail(validated.email);
				if (existingUser.ok && existingUser.value) {
					throw new Error("User already exists");
				}

				// Hash password
				const hashedPassword = await hashPassword(validated.password);

				// Create user
				const userResult = await userRepo.create(
					validated.email,
					hashedPassword,
					validated.encryptedMasterKey,
				);

				if (!userResult.ok) {
					throw userResult.error;
				}

				const user = userResult.value;

				// Generate tokens
				const accessToken = await generateAccessToken(
					user.id,
					user.email,
					config.accessTokenSecret,
					config.accessTokenExpiry,
				);

				const refreshToken = await generateRefreshToken(
					user.id,
					user.email,
					config.refreshTokenSecret,
					config.refreshTokenExpiry,
				);

				// Store refresh token hash
				const tokenHash = hashToken(refreshToken);
				const tokenResult = await tokenRepo.create(user.id, tokenHash);

				if (!tokenResult.ok) {
					throw tokenResult.error;
				}

				// Return sanitized user and tokens
				return {
					user: sanitizeUser(user),
					accessToken,
					refreshToken,
				};
			});
		},

		async signIn(dto) {
			return Result.wrapAsync(async () => {
				// Validate input
				const validated = signInSchema.parse(dto);

				// Get user by email
				const userResult = await userRepo.getByEmail(validated.email);

				if (!userResult.ok) {
					throw userResult.error;
				}

				if (!userResult.value) {
					throw new Error("Invalid credentials");
				}

				const user = userResult.value;

				// Verify password
				const isPasswordValid = await Bun.password.verify(
					validated.password,
					user.hashedPassword,
				);

				if (!isPasswordValid) {
					throw new Error("Invalid credentials");
				}

				// Generate tokens
				const accessToken = await generateAccessToken(
					user.id,
					user.email,
					config.accessTokenSecret,
					config.accessTokenExpiry,
				);

				const refreshToken = await generateRefreshToken(
					user.id,
					user.email,
					config.refreshTokenSecret,
					config.refreshTokenExpiry,
				);

				// Store refresh token hash
				const tokenHash = hashToken(refreshToken);
				const tokenResult = await tokenRepo.create(user.id, tokenHash);

				if (!tokenResult.ok) {
					throw tokenResult.error;
				}

				// Return sanitized user and tokens
				return {
					user: sanitizeUser(user),
					accessToken,
					refreshToken,
				};
			});
		},
	};
}
