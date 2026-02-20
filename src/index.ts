import { Hono } from "hono";
import { migrator } from "./db/migrator";
import { authRouter } from "./routes/auth-routes";
import { syncRouter } from "./routes/sync-routes";

const migrationResult = await migrator.migrateToLatest();

if (migrationResult.error) {
  if (typeof migrationResult.error === "string") {
    throw new Error(migrationResult.error);
  }

  throw migrationResult.error;
}

const app = new Hono()
  .get("/status", (c) => c.json({ status: "ok" }))
  .route("/v0/auth", authRouter)
  .route("/v0/sync", syncRouter);

Bun.serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) });
