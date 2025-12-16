import type { TokenService } from "@/modules/token/token.service";
import type { UserRepo } from "@/modules/user/user.repo";
import { ConflictError, UnauthorizedError } from "@/shared/errors";
import { hashPassword, sanitizeUser, verifyPassword } from "./auth.domain";
import type { AuthResponse, SignInDTO, SignUpDTO } from "./auth.schema";
import { signInSchema, signUpSchema } from "./auth.schema";

export type AuthService = {
	signUp: (dto: SignUpDTO) => Promise<AuthResponse>;
	signIn: (dto: SignInDTO) => Promise<AuthResponse>;
};

export function createAuthService(
	userRepo: UserRepo,
	tokenService: TokenService,
): AuthService {
	return {
		async signUp(dto) {
			// Validate input
			const validated = signUpSchema.parse(dto);

			// Normalize email to lowercase and trim whitespace
			const normalizedEmail = validated.email.trim().toLowerCase();

			// Check if user already exists
			const existingUser = await userRepo.getByEmail(normalizedEmail);
			if (existingUser) {
				throw new ConflictError("User already exists");
			}

			// Hash password
			const hashedPassword = await hashPassword(validated.password);

			// Create user
			const user = await userRepo.create(
				normalizedEmail,
				hashedPassword,
				validated.encryptedMasterKey,
			);

			// Generate and persist tokens via tokenService
			const tokens = await tokenService.issueTokens(user.id, user.email);

			return { user: sanitizeUser(user), ...tokens };
		},

		async signIn(dto) {
			// Validate input
			const validated = signInSchema.parse(dto);

			// Normalize email to lowercase and trim whitespace
			const normalizedEmail = validated.email.trim().toLowerCase();

			// Get user by email
			const user = await userRepo.getByEmail(normalizedEmail);

			if (!user) {
				throw new UnauthorizedError("Invalid credentials");
			}

			// Verify password
			const isPasswordValid = await verifyPassword(
				validated.password,
				user.hashedPassword,
			);

			if (!isPasswordValid) {
				throw new UnauthorizedError("Invalid credentials");
			}

			const tokens = await tokenService.issueTokens(user.id, user.email);

			return { user: sanitizeUser(user), ...tokens };
		},
	};
}
