import { Hono, type MiddlewareHandler } from "hono";
import type { JwtVariables } from "hono/jwt";
import { validator } from "hono/validator";
import { accessTokenSchema } from "@/modules/token/token.schema";
import {
	InternalServerError,
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "@/shared/errors";
import { noContentResponse, okResponse } from "@/shared/responses";
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

			return okResponse(c, doc.value);
		})
		.patch(
			"/:key",
			validator("json", (value, _c) => {
				const key = _c.req.param("key");
				const parsed = mergeDocSchema.safeParse({ key, doc: value });
				if (!parsed.success) {
					throw new ValidationError(parsed.error);
				}
				return parsed.data;
			}),
			async (c) => {
				const token = accessTokenSchema.safeParse(c.get("jwtPayload"));

				if (!token.success) {
					console.error("Invalid JWT payload:", token.error);
					throw new UnauthorizedError("Unauthorized", "INVALID_JWT_PAYLOAD");
				}

				const data = c.req.valid("json");

				const result = await docService.merge(token.data.sub, data);

				if (!result.ok) {
					console.error("Failed to merge document:", result.error);
					throw new InternalServerError("Failed to merge document");
				}

				return noContentResponse(c);
			},
		);
}
