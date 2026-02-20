import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { SyncService } from "../services/sync-service";
import { dataRepo } from "../repos/data-repo";

const syncService = new SyncService(dataRepo);

export const syncRouter = new Hono()
  .use(jwt({ secret: process.env.JWT_SECRET! }))
  .get("/:address/:type", async (c) => {
    const { address, type } = c.req.param();
    const payload = c.get("jwtPayload");

    if (payload.sub !== address) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const result = await syncService.getData(address, type);

    if (result.status === "not_found") {
      return c.json({ error: "Not found" }, 404);
    }

    return c.json({ enc_data: result.enc_data });
  })
  .put(
    "/:address/:type",
    zValidator("json", z.object({ enc_data: z.string().min(1) })),
    async (c) => {
      const { address, type } = c.req.param();
      const payload = c.get("jwtPayload");
      if (payload.sub !== address) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const { enc_data } = c.req.valid("json");
      await syncService.putData(address, type, enc_data);
      return c.json({ ok: true });
    },
  );
