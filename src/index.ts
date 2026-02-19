import { Hono } from "hono";
import { migrator } from "./db/migrator";

const migrationResult = await migrator.migrateToLatest();

if (migrationResult.error) {
  if (typeof migrationResult.error === "string") {
    throw new Error(migrationResult.error);
  }

  throw migrationResult.error;
}

const app = new Hono().get("/status", (c) => {
  return c.json({ status: "ok" });
});

Bun.serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) });
