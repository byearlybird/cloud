import type { AnyObject, JsonDocument } from "@byearlybird/starling/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { JwtVariables } from "hono/jwt";
import { jwt } from "hono/jwt";
import type { DocumentService } from "../services/document";
import { jsonApiDocumentSchema } from "../services/document";

export function createDocumentRoutes(
	documentService: DocumentService,
	accessTokenSecret: string,
) {
	const document = new Hono<{ Variables: JwtVariables }>()
		// Protected document routes - use built-in JWT middleware with access token secret
		.use("/*", jwt({ secret: accessTokenSecret }))
		.get("/:key", async (c) => {
			const payload = c.get("jwtPayload");
			const userId = payload.sub as string;
			const key = c.req.param("key");

			const documentData = await documentService.getDocument(userId, key);

			if (!documentData) {
				return c.json({ error: "Document not found" }, 404);
			}

			return c.json(documentData, 200);
		})
		.patch("/:key", zValidator("json", jsonApiDocumentSchema), async (c) => {
			const payload = c.get("jwtPayload");
			const userId = payload.sub as string;
			const key = c.req.param("key");

			const documentData = c.req.valid("json") as JsonDocument<AnyObject>;

			await documentService.mergeDocument(userId, key, documentData);

			return c.json({ success: true }, 200);
		});

	return document;
}
