import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { AuthService } from "../services/auth-service";
import { vaultRepo } from "../repos/vault-repo";
import { challengeRepo } from "../repos/challenge-repo";

const authService = new AuthService(vaultRepo, challengeRepo, process.env.JWT_SECRET!);

export const authRouter = new Hono()
  .post(
    "/register",
    zValidator(
      "json",
      z.object({
        publicKey: z.record(z.string(), z.unknown()),
      }),
    ),
    async (c) => {
      const { publicKey } = c.req.valid("json");
      const address = await authService.createVault(publicKey as JsonWebKey);
      return c.json({ address });
    },
  )
  .get("/challenge/:address", async (c) => {
    const { address } = c.req.param();
    const result = await authService.getChallenge(address);

    if (result.status === "not_found") {
      return c.json({ error: "Vault not found" }, 404);
    }

    return c.json(result);
  })
  .post(
    "/challenge/:address",
    zValidator(
      "json",
      z.object({
        challengeId: z.uuid(),
        signature: z.string().min(1),
      }),
    ),
    async (c) => {
      const { address } = c.req.param();
      const { challengeId, signature } = c.req.valid("json");
      const result = await authService.verifyChallenge(address, challengeId, signature);

      switch (result.status) {
        case "success":
          return c.json({ accessToken: result.accessToken, refreshToken: result.refreshToken });
        case "not_found":
          return c.json({ error: "Challenge not found" }, 404);
        case "invalid_challenge":
          return c.json({ error: "Invalid challenge" }, 400);
      }
    },
  )
  .post(
    "/refresh",
    zValidator(
      "json",
      z.object({
        refreshToken: z.string().min(1),
      }),
    ),
    async (c) => {
      const { refreshToken } = c.req.valid("json");
      const result = await authService.refreshTokens(refreshToken);

      if (result.status === "invalid") {
        return c.json({ error: "Invalid refresh token" }, 401);
      }

      return c.json({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    },
  );
