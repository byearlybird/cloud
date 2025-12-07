import { Hono, type MiddlewareHandler } from "hono";
import type { JwtVariables } from "hono/jwt";
import { accessTokenSchema } from "@/modules/token/token.schema";
import {
	InternalServerError,
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "@/shared/errors";
import { mergeDocSchema } from "./document.schema";
import type { DocumentService } from "./document.service";

export function createDocumentRoutes(
	docService: DocumentService,
	jwtMiddleware: MiddlewareHandler,
) {
	return new Hono<{ Variables: JwtVariables }>()
		.use("/*", jwtMiddleware)
		.get("/:key", async (c) => {
			const key = c.req.param("key");
			const token = accessTokenSchema.safeParse(c.get("jwtPayload"));

			if (!token.success) {
				console.error("Invalid JWT payload:", token.error);
				throw new UnauthorizedError("Unauthorized", "INVALID_JWT_PAYLOAD");
			}

			const doc = await docService.get(token.data.sub, { key });

			if (!doc.ok) {
				console.error("Failed to get document:", doc.error);
				throw new InternalServerError("Failed to retrieve document");
			}

			if (!doc.value) {
				throw new NotFoundError("Document not found");
			}

			return c.json(doc.value, 200);
		})
		.patch("/:key", async (c) => {
			const key = c.req.param("key");
			const token = accessTokenSchema.safeParse(c.get("jwtPayload"));

			if (!token.success) {
				console.error("Invalid JWT payload:", token.error);
				throw new UnauthorizedError("Unauthorized", "INVALID_JWT_PAYLOAD");
			}

			const body = await c.req.json();
			const parsed = mergeDocSchema.safeParse({ key, doc: body });

			if (!parsed.success) {
				throw new ValidationError(parsed.error.flatten());
			}

			const result = await docService.merge(token.data.sub, parsed.data);

			if (!result.ok) {
				console.error("Failed to merge document:", result.error);
				throw new InternalServerError("Failed to merge document");
			}

			return c.body(null, 204);
		});
}
