import { describe, expect, it } from "bun:test";
import { AuthService } from "./auth-service";
import type { AuthRepo } from "./auth-repo";
import type { User } from "./db/schema";

const JWT_SECRET = "test-secret";

async function makeUser(
  email = "test@example.com",
  password = "password123",
): Promise<User> {
  const now = new Date().toISOString();
  return {
    id: "user-1",
    email,
    hashed_password: await Bun.password.hash(password),
    created_at: now,
    updated_at: now,
  };
}

function makeAuthRepo(existingUser?: User): AuthRepo {
  const users = existingUser ? [existingUser] : [];
  return {
    findByEmail: async (email: string) => users.find((u) => u.email === email),
    create: async (id: string, email: string, hashedPassword: string) => {
      const now = new Date().toISOString();
      const user: User = {
        id,
        email,
        hashed_password: hashedPassword,
        created_at: now,
        updated_at: now,
      };
      users.push(user);
      return user;
    },
  } satisfies AuthRepo;
}

describe("AuthService.signUp", () => {
  it("creates a new user and returns tokens", async () => {
    const service = new AuthService(makeAuthRepo(), JWT_SECRET);
    const result = await service.signUp("new@example.com", "password123");
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.userId).toBeString();
      expect(result.accessToken).toBeString();
      expect(result.refreshToken).toBeString();
    }
  });

  it("returns conflict when email already exists", async () => {
    const existing = await makeUser();
    const service = new AuthService(makeAuthRepo(existing), JWT_SECRET);
    const result = await service.signUp("test@example.com", "password123");
    expect(result.status).toBe("conflict");
  });
});

describe("AuthService.signIn", () => {
  it("returns tokens on valid credentials", async () => {
    const existing = await makeUser("test@example.com", "password123");
    const service = new AuthService(makeAuthRepo(existing), JWT_SECRET);
    const result = await service.signIn("test@example.com", "password123");
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.accessToken).toBeString();
      expect(result.refreshToken).toBeString();
    }
  });

  it("returns invalid_credentials for wrong email", async () => {
    const service = new AuthService(makeAuthRepo(), JWT_SECRET);
    const result = await service.signIn("nobody@example.com", "password123");
    expect(result.status).toBe("invalid_credentials");
  });

  it("returns invalid_credentials for wrong password", async () => {
    const existing = await makeUser("test@example.com", "password123");
    const service = new AuthService(makeAuthRepo(existing), JWT_SECRET);
    const result = await service.signIn("test@example.com", "wrongpassword");
    expect(result.status).toBe("invalid_credentials");
  });
});

describe("AuthService.refresh", () => {
  it("returns new tokens for a valid refresh token", async () => {
    const existing = await makeUser("test@example.com", "password123");
    const service = new AuthService(makeAuthRepo(existing), JWT_SECRET);
    const signInResult = await service.signIn(
      "test@example.com",
      "password123",
    );
    if (signInResult.status !== "success") throw new Error("sign-in failed");

    const result = await service.refresh(signInResult.refreshToken);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.accessToken).toBeString();
      expect(result.refreshToken).toBeString();
    }
  });

  it("returns invalid_token for an access token used as refresh", async () => {
    const existing = await makeUser("test@example.com", "password123");
    const service = new AuthService(makeAuthRepo(existing), JWT_SECRET);
    const signInResult = await service.signIn(
      "test@example.com",
      "password123",
    );
    if (signInResult.status !== "success") throw new Error("sign-in failed");

    const result = await service.refresh(signInResult.accessToken);
    expect(result.status).toBe("invalid_token");
  });

  it("returns invalid_token for garbage input", async () => {
    const service = new AuthService(makeAuthRepo(), JWT_SECRET);
    const result = await service.refresh("not-a-real-token");
    expect(result.status).toBe("invalid_token");
  });
});
