import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { AuthService } from "../services/auth";
import {
	refreshTokenInput,
	signInSchema,
	signUpSchema,
} from "../services/auth";

// Create a register request schema - only email and password from newUserSchema
const signupSchema = signUpSchema.pick({
	email: true,
	password: true,
	encryptedMasterKey: true,
});

export function createAuthRoutes(authService: AuthService) {
	const auth = new Hono()
		.post("/signin", zValidator("json", signInSchema), async (c) => {
			const { email, password } = c.req.valid("json");
			const result = await authService.signIn(email, password);

			if (result.ok) {
				const { user, accessToken, refreshToken } = result.val;
				return c.json({ accessToken, refreshToken, user }, 200);
			}

			switch (result.val) {
				case "user_not_found":
					// use 401 for obscurity
					return c.json({ error: "Invalid email or password" }, 401);
				case "invalid_credentials":
					return c.json({ error: "Invalid email or password" }, 401);
				default:
					return c.json({ error: "Unknown error" }, 500);
			}
		})
		.post("/signup", zValidator("json", signupSchema), async (c) => {
			const { email, password, encryptedMasterKey } = c.req.valid("json");
			const result = await authService.signUp(
				email,
				password,
				encryptedMasterKey,
			);

			if (result.ok) {
				return c.json(result.val, 201);
			}

			switch (result.val) {
				case "already_exists":
					return c.json({ error: "User already exists" }, 409);
				case "invalid_data":
					return c.json({ error: "Invalid data" }, 400);
				default:
					return c.json({ error: "Unknown error" }, 500);
			}
		})
		.post("/refresh", zValidator("json", refreshTokenInput), async (c) => {
			const { refreshToken } = c.req.valid("json");
			const result = await authService.refreshAccessToken(refreshToken);

			if (result.ok) {
				const { accessToken, refreshToken: newRefreshToken } = result.val;
				return c.json({ accessToken, refreshToken: newRefreshToken }, 200);
			}

			return c.json({ error: "Invalid or expired refresh token" }, 401);
		})
		.post("/signout", zValidator("json", refreshTokenInput), async (c) => {
			const { refreshToken } = c.req.valid("json");
			await authService.signout(refreshToken);
			return c.json({ success: true }, 200);
		});

	return auth;
}
