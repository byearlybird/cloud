import type { TokenService } from "@/modules/token/token.service";
import type { UserRepo } from "@/modules/user/user.repo";
import { Result } from "@/shared/result";
import { hashPassword, sanitizeUser, verifyPassword } from "./auth.domain";
import type { AuthResponse, SignInDTO, SignUpDTO } from "./auth.schema";
import { signInSchema, signUpSchema } from "./auth.schema";

export type AuthService = {
	signUp: (dto: SignUpDTO) => Promise<Result<AuthResponse>>;
	signIn: (dto: SignInDTO) => Promise<Result<AuthResponse>>;
};

export function createAuthService(
	userRepo: UserRepo,
	tokenService: TokenService,
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

				// Generate and persist tokens via tokenService
				const tokenResult = await tokenService.issueTokens(user.id, user.email);

				if (!tokenResult.ok) {
					throw tokenResult.error;
				}

				return { user: sanitizeUser(user), ...tokenResult.value };
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
				const isPasswordValid = await verifyPassword(
					validated.password,
					user.hashedPassword,
				);

				if (!isPasswordValid) {
					throw new Error("Invalid credentials");
				}

				const tokenResult = await tokenService.issueTokens(user.id, user.email);

				if (!tokenResult.ok) {
					throw tokenResult.error;
				}

				return { user: sanitizeUser(user), ...tokenResult.value };
			});
		},
	};
}
