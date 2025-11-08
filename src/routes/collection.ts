import type { Collection } from "@byearlybird/starling";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { JwtVariables } from "hono/jwt";
import { jwt } from "hono/jwt";
import type { CollectionService } from "../services/collection";
import { collectionSchema } from "../services/collection";

export function createCollectionRoutes(
	collectionService: CollectionService,
	accessTokenSecret: string,
) {
	const collection = new Hono<{ Variables: JwtVariables }>();

	// Protected collection routes - use built-in JWT middleware with access token secret
	collection.use("/*", jwt({ secret: accessTokenSecret }));

	collection.get("/:key", async (c) => {
		const payload = c.get("jwtPayload");
		const userId = payload.sub as string;
		const key = c.req.param("key");

		const collectionData = await collectionService.getCollection(userId, key);

		if (!collectionData) {
			return c.json({ error: "Collection not found" }, 404);
		}

		return c.json(collectionData, 200);
	});

	collection.put("/:key", zValidator("json", collectionSchema), async (c) => {
		const payload = c.get("jwtPayload");
		const userId = payload.sub as string;
		const key = c.req.param("key");

		const collectionData = c.req.valid("json") as Collection;

		await collectionService.mergeCollection(userId, key, collectionData);

		return c.json({ success: true }, 200);
	});

	return collection;
}
