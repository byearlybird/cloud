import { Hono } from "hono";
import { signInSchema, signUpSchema } from "./auth.schema";
import type { AuthService } from "./auth.service";

export function createAuthRoutes(authService: AuthService) {
	return new Hono()
		.post("/signup", async (c) => {
			const body = await c.req.json();
			const parsed = signUpSchema.safeParse(body);

			if (!parsed.success) {
				return c.json(
					{ error: "Invalid request body", details: parsed.error.flatten() },
					400,
				);
			}

			const result = await authService.signUp(parsed.data);

			if (!result.ok) {
				console.error("Failed to sign up:", result.error);

				// Check for specific error types
				if (
					result.error instanceof Error &&
					result.error.message === "User already exists"
				) {
					return c.json({ error: "User already exists" }, 409);
				}

				return c.json({ error: "Failed to sign up" }, 500);
			}

			return c.json(result.value, 201);
		})
		.post("/signin", async (c) => {
			const body = await c.req.json();
			const parsed = signInSchema.safeParse(body);

			if (!parsed.success) {
				return c.json(
					{ error: "Invalid request body", details: parsed.error.flatten() },
					400,
				);
			}

			const result = await authService.signIn(parsed.data);

			if (!result.ok) {
				console.error("Failed to sign in:", result.error);

				// Don't leak information about whether user exists
				if (
					result.error instanceof Error &&
					result.error.message === "Invalid credentials"
				) {
					return c.json({ error: "Invalid email or password" }, 401);
				}

				return c.json({ error: "Failed to sign in" }, 500);
			}

			return c.json(result.value, 200);
		});
}
