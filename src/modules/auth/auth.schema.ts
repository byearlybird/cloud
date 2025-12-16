import { z } from "zod";
import type { User } from "@/modules/user/user.repo";

export type AuthResponse = {
	user: Omit<User, "hashedPassword">;
	accessToken: string;
	refreshToken: string;
};

// DTOs with Zod validation
export const signUpSchema = z.object({
	email: z.email(),
	password: z.string().min(8),
	encryptedMasterKey: z.string(),
});

export const signInSchema = z.object({
	email: z.email(),
	password: z.string(),
});

export type SignUpDTO = z.infer<typeof signUpSchema>;
export type SignInDTO = z.infer<typeof signInSchema>;
