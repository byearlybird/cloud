import { Hono } from "hono";
import {
	ConflictError,
	InternalServerError,
	UnauthorizedError,
	ValidationError,
} from "@/shared/errors";
import { createdResponse, okResponse } from "@/shared/responses";
import { signInSchema, signUpSchema } from "./auth.schema";
import type { AuthService } from "./auth.service";

export function createAuthRoutes(authService: AuthService) {
	return new Hono()
		.post("/signup", async (c) => {
			const body = await c.req.json();
			const parsed = signUpSchema.safeParse(body);

			if (!parsed.success) {
				throw new ValidationError(parsed.error.flatten());
			}

			const result = await authService.signUp(parsed.data);

			if (!result.ok) {
				console.error("Failed to sign up:", result.error);

				// Check for specific error types
				if (
					result.error instanceof Error &&
					result.error.message === "User already exists"
				) {
					throw new ConflictError("User already exists");
				}

				throw new InternalServerError("Failed to sign up");
			}

			return createdResponse(c, result.value);
		})
		.post("/signin", async (c) => {
			const body = await c.req.json();
			const parsed = signInSchema.safeParse(body);

			if (!parsed.success) {
				throw new ValidationError(parsed.error.flatten());
			}

			const result = await authService.signIn(parsed.data);

			if (!result.ok) {
				console.error("Failed to sign in:", result.error);

				// Don't leak information about whether user exists
				if (
					result.error instanceof Error &&
					result.error.message === "Invalid credentials"
				) {
					throw new UnauthorizedError("Invalid email or password");
				}

				throw new InternalServerError("Failed to sign in");
			}

			return okResponse(c, result.value);
		});
}
