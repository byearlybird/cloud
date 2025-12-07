import { jwt } from "hono/jwt";
import { createAuthRoutes } from "@/modules/auth/auth.routes";
import { createDocumentRoutes } from "@/modules/document/document.routes";
import { authService, documentService } from "./app.services";

const jwtMiddleware = jwt({
	secret: "",
});

export const documentRoutes = createDocumentRoutes(
	documentService,
	jwtMiddleware,
);
export const authRoutes = createAuthRoutes(authService);
