import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { AuthService } from "../services/auth";
import {
	newUserSchema,
	refreshTokenSchema,
	signInSchema,
} from "../services/auth";

// Create a register request schema - only email and password from newUserSchema
const registerSchema = newUserSchema.pick({ email: true, password: true });

export function createAuthRoutes(authService: AuthService) {
	const auth = new Hono();

	auth.post("/signin", zValidator("json", signInSchema), async (c) => {
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
	});

	auth.post("/signup", zValidator("json", registerSchema), async (c) => {
		const { email, password } = c.req.valid("json");
		const result = await authService.register(email, password);

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
	});

	auth.post("/refresh", zValidator("json", refreshTokenSchema), async (c) => {
		const { refreshToken } = c.req.valid("json");
		const result = await authService.refreshAccessToken(refreshToken);

		if (result.ok) {
			const { accessToken, refreshToken: newRefreshToken } = result.val;
			return c.json({ accessToken, refreshToken: newRefreshToken }, 200);
		}

		return c.json({ error: "Invalid or expired refresh token" }, 401);
	});

	auth.post("/logout", zValidator("json", refreshTokenSchema), async (c) => {
		const { refreshToken } = c.req.valid("json");
		await authService.logout(refreshToken);
		return c.json({ success: true }, 200);
	});

	return auth;
}
