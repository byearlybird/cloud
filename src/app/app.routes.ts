import { jwt } from "hono/jwt";
import { env } from "@/env";
import { createAuthRoutes } from "@/modules/auth/auth.routes";
import { createDocumentRoutes } from "@/modules/document/document.routes";
import { createTokenRoutes } from "@/modules/token/token.routes";
import { authService, documentService, tokenService } from "./app.services";

const accessTokenMiddleware = jwt({
	secret: env.ACCESS_TOKEN_SECRET,
});

export const authRoutes = createAuthRoutes(authService);
export const documentRoutes = createDocumentRoutes(
	documentService,
	accessTokenMiddleware,
);
export const tokenRoutes = createTokenRoutes(tokenService);
