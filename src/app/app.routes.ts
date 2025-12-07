import { Hono } from "hono";
import { cors } from "hono/cors";
import { jwt } from "hono/jwt";
import { env } from "@/env";
import { createAuthRoutes } from "@/modules/auth/auth.routes";
import { createDocumentRoutes } from "@/modules/document/document.routes";
import { createTokenRoutes } from "@/modules/token/token.routes";
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
	.route("/auth", authRoutes)
	.route("/tokens", tokenRoutes)
	.route("/documents", documentRoutes);

export type AppRoutes = typeof appRoutes;
