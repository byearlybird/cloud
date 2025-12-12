import { Hono } from "hono";
import { validator } from "hono/validator";
import { ValidationError } from "@/shared/errors";
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
				const tokens = await tokenService.refresh(refreshToken);
				return okResponse(c, tokens);
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
				await tokenService.revoke(refreshToken);
				return noContentResponse(c);
			},
		);
}
