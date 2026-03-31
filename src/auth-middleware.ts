import { jwt } from "hono/jwt";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from ".";

const extractUserId = createMiddleware<AppEnv>(async (c, next) => {
  const payload = c.get("jwtPayload");
  c.set("userId", payload.sub);
  await next();
});

export const authMiddleware = (secret: string) => [
  jwt({ secret, alg: "HS256" }),
  extractUserId,
];
