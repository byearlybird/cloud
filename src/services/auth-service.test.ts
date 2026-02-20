import { describe, expect, it } from "bun:test";
import { AuthService } from "./auth-service";
import { generateKeyPair, signChallenge } from "../utils/crypto";
import type { VaultRepo } from "../repos/vault-repo";
import type { ChallengeRepo } from "../repos/challenge-repo";
import { Vault } from "../db/schema";

const JWT_SECRET = "test-secret";

function makeVaultRepo(vault?: Awaited<ReturnType<VaultRepo["get"]>>) {
  return {
    create: async (data: Parameters<VaultRepo["create"]>[0]) => data.address,
    get: async (_: string) => vault,
  } satisfies VaultRepo;
}

function makeChallengeRepo(challenge?: string) {
  return {
    create: async () => {},
    consumeIfValid: async () => challenge,
  } satisfies ChallengeRepo;
}

function makeVault(publicKey: JsonWebKey, address = "abc123"): Vault {
  return { address, public_key: JSON.stringify(publicKey), created_at: new Date().toISOString() };
}

describe("AuthService.createVault", () => {
  it("returns the vault address as a 40-char hex string", async () => {
    const { publicKey } = await generateKeyPair();
    const service = new AuthService(makeVaultRepo(), makeChallengeRepo(), JWT_SECRET);
    const address = await service.createVault(publicKey);
    expect(address).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("AuthService.getChallenge", () => {
  it("returns not_found when vault does not exist", async () => {
    const service = new AuthService(makeVaultRepo(undefined), makeChallengeRepo(), JWT_SECRET);
    const result = await service.getChallenge("0x000");
    expect(result.status).toBe("not_found");
  });

  it("returns success with challengeId and challenge as UUIDs when vault exists", async () => {
    const { publicKey } = await generateKeyPair();
    const vault = makeVault(publicKey);
    const service = new AuthService(makeVaultRepo(vault), makeChallengeRepo(), JWT_SECRET);
    const result = await service.getChallenge(vault.address);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.challengeId).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.challenge).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});

describe("AuthService.verifyChallenge", () => {
  it("returns not_found when vault does not exist", async () => {
    const service = new AuthService(
      makeVaultRepo(undefined),
      makeChallengeRepo("some-challenge"),
      JWT_SECRET,
    );
    const result = await service.verifyChallenge("0x000", "cid", "sig");
    expect(result.status).toBe("not_found");
  });

  it("returns not_found when challenge is expired/missing", async () => {
    const { publicKey } = await generateKeyPair();
    const vault = makeVault(publicKey);
    const service = new AuthService(makeVaultRepo(vault), makeChallengeRepo(undefined), JWT_SECRET);
    const result = await service.verifyChallenge(vault.address, "cid", "sig");
    expect(result.status).toBe("not_found");
  });

  it("returns invalid_challenge when signature is wrong", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const challenge = "real-challenge-uuid";
    // Sign a different string so the signature won't match the challenge
    const wrongSignature = await signChallenge(privateKey, "different-string");
    const vault = makeVault(publicKey);
    const service = new AuthService(makeVaultRepo(vault), makeChallengeRepo(challenge), JWT_SECRET);
    const result = await service.verifyChallenge(vault.address, "cid", wrongSignature);
    expect(result.status).toBe("invalid_challenge");
  });

  it("returns success with tokens when signature is valid", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const challenge = "valid-challenge-uuid";
    const signature = await signChallenge(privateKey, challenge);
    const vault = makeVault(publicKey);
    const service = new AuthService(makeVaultRepo(vault), makeChallengeRepo(challenge), JWT_SECRET);
    const result = await service.verifyChallenge(vault.address, "cid", signature);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.accessToken.length).toBeGreaterThan(0);
      expect(result.refreshToken.length).toBeGreaterThan(0);
    }
  });
});

describe("AuthService.refreshTokens", () => {
  it("returns success with new tokens given a valid refresh token", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const challenge = "valid-challenge-uuid";
    const signature = await signChallenge(privateKey, challenge);
    const vault = makeVault(publicKey);
    const service = new AuthService(makeVaultRepo(vault), makeChallengeRepo(challenge), JWT_SECRET);
    const verified = await service.verifyChallenge(vault.address, "cid", signature);
    expect(verified.status).toBe("success");
    const { refreshToken } = verified as {
      status: "success";
      accessToken: string;
      refreshToken: string;
    };

    const result = await service.refreshTokens(refreshToken);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.accessToken.length).toBeGreaterThan(0);
      expect(result.refreshToken.length).toBeGreaterThan(0);
    }
  });

  it("returns invalid for a garbage token", async () => {
    const service = new AuthService(makeVaultRepo(), makeChallengeRepo(), JWT_SECRET);
    const result = await service.refreshTokens("not.a.jwt");
    expect(result.status).toBe("invalid");
  });

  it("returns invalid when an access token is used as a refresh token", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const challenge = "valid-challenge-uuid";
    const signature = await signChallenge(privateKey, challenge);
    const vault = makeVault(publicKey);
    const service = new AuthService(makeVaultRepo(vault), makeChallengeRepo(challenge), JWT_SECRET);
    const verified = await service.verifyChallenge(vault.address, "cid", signature);
    expect(verified.status).toBe("success");
    const { accessToken } = verified as {
      status: "success";
      accessToken: string;
      refreshToken: string;
    };

    const result = await service.refreshTokens(accessToken);
    expect(result.status).toBe("invalid");
  });
});
