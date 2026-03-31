import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { AuthService } from "./auth-service";
import { authRepo } from "./auth-repo";
import { env } from "./env";

const authService = new AuthService(
  authRepo,
  env.JWT_SECRET,
  env.JWT_ACCESS_EXPIRY,
  env.JWT_REFRESH_EXPIRY,
);

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authRouter = new Hono()
  .post("/sign-up", zValidator("json", credentialsSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    const result = await authService.signUp(email, password);

    if (result.status === "conflict") {
      return c.json({ error: "Email already in use" }, 409);
    }

    return c.json(
      {
        userId: result.userId,
        email,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      201,
    );
  })
  .post("/sign-in", zValidator("json", credentialsSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    const result = await authService.signIn(email, password);

    if (result.status === "invalid_credentials") {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    return c.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  })
  .post(
    "/refresh",
    zValidator("json", z.object({ refreshToken: z.string() })),
    async (c) => {
      const { refreshToken } = c.req.valid("json");
      const result = await authService.refresh(refreshToken);

      if (result.status === "invalid_token") {
        return c.json({ error: "Invalid or expired refresh token" }, 401);
      }

      return c.json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    },
  );
