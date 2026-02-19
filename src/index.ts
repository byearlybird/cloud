import { Hono } from "hono";

const app = new Hono()
  .get("/status", (c) => {
    return c.json({ status: "ok" });
  });

Bun.serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) });
