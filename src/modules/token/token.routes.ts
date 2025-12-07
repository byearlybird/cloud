import { Hono } from "hono";

import { refreshTokenDTO } from "./token.schema";
import type { TokenService } from "./token.service";

export function createTokenRoutes(tokenService: TokenService) {
	return new Hono()
		.post("/refresh", async (c) => {
			const body = await c.req.json();
			const parsed = refreshTokenDTO.safeParse(body);

			if (!parsed.success) {
				return c.json(
					{ error: "Invalid request body", details: parsed.error.format() },
					400,
				);
			}

			const result = await tokenService.refresh(parsed.data.refreshToken);

			if (!result.ok) {
				console.error("Failed to refresh token:", result.error);
				return c.json({ error: "Invalid or expired token" }, 401);
			}

			return c.json(result.value, 200);
		})
		.post("/revoke", async (c) => {
			const body = await c.req.json();
			const parsed = refreshTokenDTO.safeParse(body);

			if (!parsed.success) {
				return c.json(
					{ error: "Invalid request body", details: parsed.error.format() },
					400,
				);
			}

			const result = await tokenService.revoke(parsed.data.refreshToken);

			if (!result.ok) {
				console.error("Failed to revoke token:", result.error);
				return c.json({ error: "Failed to revoke token" }, 500);
			}

			return c.body(null, 204);
		});
}
