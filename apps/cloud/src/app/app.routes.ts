import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { jwt } from "hono/jwt";
import { env } from "@/env";
import { createAuthRoutes } from "@/modules/auth/auth.routes";
import { createDocumentRoutes } from "@/modules/document/document.routes";
import { createTokenRoutes } from "@/modules/token/token.routes";
import { ApiError, InternalServerError } from "@/shared/errors";
import { authService, documentService, tokenService } from "./app.services";

const authRoutes = createAuthRoutes(authService);
const tokenRoutes = createTokenRoutes(tokenService);
const documentRoutes = createDocumentRoutes(
	documentService,
	jwt({
		secret: env.ACCESS_TOKEN_SECRET,
	}),
);

export const appRoutes = new Hono()
	.use(
		cors({
			origin: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
			credentials: true,
		}),
	)
	.get("/health", (c) => {
		return c.json({
			status: "ok",
			timestamp: new Date().toISOString(),
		});
	})
	.route("/auth", authRoutes)
	.route("/tokens", tokenRoutes)
	.route("/documents", documentRoutes)
	.onError((err, c) => {
		if (err instanceof ApiError) {
			return err.toResponse(c);
		}

		if (err instanceof HTTPException) {
			return err.getResponse();
		}

		console.error(err);
		return new InternalServerError().toResponse(c);
	});

export type AppRoutes = typeof appRoutes;
