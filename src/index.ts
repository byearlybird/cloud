import { Hono } from "hono";
import { cors } from "hono/cors";
import { migrator } from "./db/migrator";
import { authMiddleware } from "./auth-middleware";
import { authRouter } from "./auth-routes";
import { backupRouter } from "./backup-routes";
import { env } from "./env";

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
  .use(cors({ origin: env.CORS_ORIGINS }))
  .get("/status", (c) => c.json({ status: "ok" }))
  .route("/v0/auth", authRouter)
  .use(...authMiddleware(env.JWT_SECRET))
  .route("/v0/backup", backupRouter);

const port = Number(process.env.PORT ?? 3000);
const server = Bun.serve({ fetch: app.fetch, port });

console.log(`Listening on http://localhost:${server.port}`);
