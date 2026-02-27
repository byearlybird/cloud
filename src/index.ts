import { Hono } from "hono";
import { migrator } from "./db/migrator";
import { clerkMiddleware } from "./clerk-middleware";
import { backupRouter } from "./backup-routes";

export type AppEnv = {
  Variables: { userId: string };
};

const migrationResult = await migrator.migrateToLatest();

if (migrationResult.error) {
  if (typeof migrationResult.error === "string") {
    throw new Error(migrationResult.error);
  }

  throw migrationResult.error;
}

const app = new Hono<AppEnv>()
  .get("/status", (c) => c.json({ status: "ok" }))
  .use(clerkMiddleware())
  .route("/v0/backup", backupRouter);

const port = Number(process.env.PORT ?? 3000);
const server = Bun.serve({ fetch: app.fetch, port });

console.log(`Listening on http://localhost:${server.port}`);
