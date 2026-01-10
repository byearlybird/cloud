import { Hono } from "hono";
import { clerkMiddleware } from "./clerk-middleware";

export type AppEnv = {
  Variables: { userId: string };
  Bindings: Env;
};

const STORAGE_KEY = (userId: string, name: string) => `${userId}:db:${name}`;

const app = new Hono<AppEnv>()
  .get("/status", (c) => {
    return c.json({ status: "ok" });
  })
  .use("/api/*", clerkMiddleware())
  .get("/api/db/:name", async (c) => {
    const name = c.req.param("name");
    const userId = c.get("userId");
    const storageKey = STORAGE_KEY(userId, name);
    const object = await c.env.journal_bucket.get(storageKey);

    if (object === null) {
      return c.json({ error: "Not found" }, 404);
    }

    return c.body(object.body, 200, { "Content-Type": "application/octet-stream" });
  })
  .put("/api/db/:name", async (c) => {
    const name = c.req.param("name");
    const userId = c.get("userId");
    const storageKey = STORAGE_KEY(userId, name);
    const arrayBuffer = await c.req.arrayBuffer();
    await c.env.journal_bucket.put(storageKey, arrayBuffer);
    return c.json({ success: true }, 200);
  });

export type AppType = typeof app;

export default app;
