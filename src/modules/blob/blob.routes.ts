import { Hono, type MiddlewareHandler } from "hono";
import type { JwtVariables } from "hono/jwt";
import { validator } from "hono/validator";
import { accessTokenSchema } from "@/modules/token/token.schema";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/shared/errors";
import { noContentResponse, okResponse } from "@/shared/responses";
import { putBlobSchema } from "./blob.schema";
import type { BlobService } from "./blob.service";

export function createBlobRoutes(
  blobService: BlobService,
  jwtMiddleware: MiddlewareHandler
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

      const blob = await blobService.get(token.data.sub, { key });

      if (!blob) {
        throw new NotFoundError("Blob not found");
      }

      return okResponse(c, blob);
    })
    .put(
      "/:key",
      validator("json", (value, _c) => {
        const key = _c.req.param("key");
        // Stringify the JSON body to store as string
        const docString = JSON.stringify(value);
        const parsed = putBlobSchema.safeParse({ key, doc: docString });
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
        await blobService.put(token.data.sub, data);
        return noContentResponse(c);
      }
    );
}
