import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from ".";

let clerkClient: ClerkClient | null = null;

function getClerkClient(): ClerkClient {
  if (!clerkClient) {
    clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
    });
  }
  return clerkClient;
}

export function clerkMiddleware() {
  return createMiddleware<AppEnv>(async (c, next) => {
    const clerk = getClerkClient();

    const authResult = await clerk.authenticateRequest(c.req.raw);
    const { isAuthenticated, toAuth } = authResult;

    if (!isAuthenticated) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { userId } = toAuth();

    c.set("userId", userId);

    await next();
  });
}
