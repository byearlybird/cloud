import { createAuthService } from "@/modules/auth/auth.service";
import { createDocumentService } from "@/modules/document/document.service";
import { documentRepo, tokenRepo, userRepo } from "./app.repos";

export const documentService = createDocumentService(documentRepo);
export const authService = createAuthService(userRepo, tokenRepo, {
	accessTokenSecret: "",
	refreshTokenSecret: "",
	accessTokenExpiry: 0,
	refreshTokenExpiry: 0,
});
