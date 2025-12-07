import { Hono } from "hono";

import { refreshTokenDTO } from "./token.schema";
import type { TokenService } from "./token.service";
import {
	InternalServerError,
	InvalidTokenError,
	ValidationError,
} from "@/shared/errors";

export function createTokenRoutes(tokenService: TokenService) {
	return new Hono()
		.post("/refresh", async (c) => {
			const body = await c.req.json();
			const parsed = refreshTokenDTO.safeParse(body);

			if (!parsed.success) {
				throw new ValidationError(parsed.error.format());
			}

			const result = await tokenService.refresh(parsed.data.refreshToken);

			if (!result.ok) {
				console.error("Failed to refresh token:", result.error);
				throw new InvalidTokenError();
			}

			return c.json(result.value, 200);
		})
		.post("/revoke", async (c) => {
			const body = await c.req.json();
			const parsed = refreshTokenDTO.safeParse(body);

			if (!parsed.success) {
				throw new ValidationError(parsed.error.format());
			}

			const result = await tokenService.revoke(parsed.data.refreshToken);

			if (!result.ok) {
				console.error("Failed to revoke token:", result.error);
				throw new InternalServerError("Failed to revoke token");
			}

			return c.body(null, 204);
		});
}
