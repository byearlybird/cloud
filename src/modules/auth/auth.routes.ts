import { Hono } from "hono";
import { validator } from "hono/validator";
import { ValidationError } from "@/shared/errors";
import { createdResponse, okResponse } from "@/shared/responses";
import { signInSchema, signUpSchema } from "./auth.schema";
import type { AuthService } from "./auth.service";

export function createAuthRoutes(authService: AuthService) {
	return new Hono()
		.post(
			"/signup",
			validator("json", (value, _c) => {
				const parsed = signUpSchema.safeParse(value);
				if (!parsed.success) {
					throw new ValidationError(parsed.error);
				}
				return parsed.data;
			}),
			async (c) => {
				const data = c.req.valid("json");
				const response = await authService.signUp(data);
				return createdResponse(c, response);
			},
		)
		.post(
			"/signin",
			validator("json", (value, _c) => {
				const parsed = signInSchema.safeParse(value);
				if (!parsed.success) {
					throw new ValidationError(parsed.error);
				}
				return parsed.data;
			}),
			async (c) => {
				const data = c.req.valid("json");
				const response = await authService.signIn(data);
				return okResponse(c, response);
			},
		);
}
