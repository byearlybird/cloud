import { Hono } from "hono";
import { validator } from "hono/validator";
import {
	InternalServerError,
	InvalidTokenError,
	ValidationError,
} from "@/shared/errors";
import { noContentResponse, okResponse } from "@/shared/responses";
import { refreshTokenDTO } from "./token.schema";
import type { TokenService } from "./token.service";

export function createTokenRoutes(tokenService: TokenService) {
	return new Hono()
		.post(
			"/refresh",
			validator("json", (value, _c) => {
				const parsed = refreshTokenDTO.safeParse(value);
				if (!parsed.success) {
					throw new ValidationError(parsed.error);
				}
				return parsed.data;
			}),
			async (c) => {
				const { refreshToken } = c.req.valid("json");

				const result = await tokenService.refresh(refreshToken);

				if (!result.ok) {
					console.error("Failed to refresh token:", result.error);
					throw new InvalidTokenError();
				}

				return okResponse(c, result.value);
			},
		)
		.post(
			"/revoke",
			validator("json", (value, _c) => {
				const parsed = refreshTokenDTO.safeParse(value);
				if (!parsed.success) {
					throw new ValidationError(parsed.error);
				}
				return parsed.data;
			}),
			async (c) => {
				const { refreshToken } = c.req.valid("json");

				const result = await tokenService.revoke(refreshToken);

				if (!result.ok) {
					console.error("Failed to revoke token:", result.error);
					throw new InternalServerError("Failed to revoke token");
				}

				return noContentResponse(c);
			},
		);
}
