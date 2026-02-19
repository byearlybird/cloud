import { Hono } from "hono";
import { migrator } from "./db/migrator";
import { authRouter } from "./routes/auth-routes";

const migrationResult = await migrator.migrateToLatest();

if (migrationResult.error) {
  if (typeof migrationResult.error === "string") {
    throw new Error(migrationResult.error);
  }

  throw migrationResult.error;
}

const app = new Hono()
  .get("/status", (c) => c.json({ status: "ok" }))
  .route("/v0/auth", authRouter);

Bun.serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) });
