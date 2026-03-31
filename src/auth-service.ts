import { sign, verify } from "hono/jwt";
import type { AuthRepo } from "./auth-repo";

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return value * multipliers[unit];
}

export class AuthService {
  #authRepo: AuthRepo;
  #jwtSecret: string;
  #accessExpirySecs: number;
  #refreshExpirySecs: number;

  constructor(
    authRepo: AuthRepo,
    jwtSecret: string,
    accessExpiry = "15m",
    refreshExpiry = "7d",
  ) {
    this.#authRepo = authRepo;
    this.#jwtSecret = jwtSecret;
    this.#accessExpirySecs = parseDuration(accessExpiry);
    this.#refreshExpirySecs = parseDuration(refreshExpiry);
  }

  async signUp(
    email: string,
    password: string,
  ): Promise<
    | {
        status: "success";
        userId: string;
        accessToken: string;
        refreshToken: string;
      }
    | { status: "conflict" }
  > {
    const existing = await this.#authRepo.findByEmail(email);
    if (existing) return { status: "conflict" };

    const id = crypto.randomUUID();
    const hashedPassword = await Bun.password.hash(password);
    await this.#authRepo.create(id, email, hashedPassword);
    const { accessToken, refreshToken } = await this.#generateTokens(id);
    return { status: "success", userId: id, accessToken, refreshToken };
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<
    | { status: "success"; accessToken: string; refreshToken: string }
    | { status: "invalid_credentials" }
  > {
    const user = await this.#authRepo.findByEmail(email);
    if (!user) return { status: "invalid_credentials" };

    const valid = await Bun.password.verify(password, user.hashed_password);
    if (!valid) return { status: "invalid_credentials" };

    const { accessToken, refreshToken } = await this.#generateTokens(user.id);
    return { status: "success", accessToken, refreshToken };
  }

  async refresh(
    refreshToken: string,
  ): Promise<
    | { status: "success"; accessToken: string; refreshToken: string }
    | { status: "invalid_token" }
  > {
    try {
      const payload = await verify(refreshToken, this.#jwtSecret, "HS256");
      if (payload.type !== "refresh" || typeof payload.sub !== "string") {
        return { status: "invalid_token" };
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await this.#generateTokens(payload.sub);
      return {
        status: "success",
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      return { status: "invalid_token" };
    }
  }

  async #generateTokens(
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const now = Math.floor(Date.now() / 1000);
    const accessToken = await sign(
      { sub: userId, iat: now, exp: now + this.#accessExpirySecs },
      this.#jwtSecret,
      "HS256",
    );
    const refreshToken = await sign(
      {
        sub: userId,
        type: "refresh",
        iat: now,
        exp: now + this.#refreshExpirySecs,
      },
      this.#jwtSecret,
      "HS256",
    );
    return { accessToken, refreshToken };
  }
}
