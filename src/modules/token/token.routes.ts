import { Hono } from "hono";

import { refreshTokenDTO } from "./token.schema";
import type { TokenService } from "./token.service";
import {
	InternalServerError,
	InvalidTokenError,
	ValidationError,
} from "@/shared/errors";
import { noContentResponse, okResponse } from "@/shared/responses";

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

			return okResponse(c, result.value);
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

			return noContentResponse(c);
		});
}
