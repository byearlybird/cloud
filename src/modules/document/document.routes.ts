import { Hono, type MiddlewareHandler } from "hono";
import type { JwtVariables } from "hono/jwt";
import { accessTokenSchema } from "@/modules/token/token.schema";
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
				return c.json({ error: "Unauthorized" }, 401);
			}

			const doc = await docService.get(token.data.sub, { key });

			if (!doc.ok) {
				console.error("Failed to get document:", doc.error);
				return c.json({ error: "Failed to retrieve document" }, 500);
			}

			if (!doc.value) {
				return c.json({ error: "Document not found" }, 404);
			}

			return c.json(doc.value, 200);
		})
		.patch("/:key", async (c) => {
			const key = c.req.param("key");
			const token = accessTokenSchema.safeParse(c.get("jwtPayload"));

			if (!token.success) {
				console.error("Invalid JWT payload:", token.error);
				return c.json({ error: "Unauthorized" }, 401);
			}

			const body = await c.req.json();
			const parsed = mergeDocSchema.safeParse({ key, doc: body });

			if (!parsed.success) {
				return c.json(
					{ error: "Invalid request body", details: parsed.error.flatten() },
					400,
				);
			}

			const result = await docService.merge(token.data.sub, parsed.data);

			if (!result.ok) {
				console.error("Failed to merge document:", result.error);
				return c.json({ error: "Failed to merge document" }, 500);
			}

			return c.body(null, 204);
		});
}
