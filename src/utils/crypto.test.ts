import { describe, expect, it } from "bun:test";
import {
  generateChallenge,
  generateKeyPair,
  makeVaultAddress,
  signChallenge,
  verifySignature,
} from "./crypto";

describe("generateKeyPair", () => {
  it("returns EC P-256 JWK key pair", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    expect(publicKey.kty).toBe("EC");
    expect(publicKey.crv).toBe("P-256");
    expect(publicKey.x).toBeDefined();
    expect(publicKey.y).toBeDefined();
    expect(privateKey.kty).toBe("EC");
    expect(privateKey.crv).toBe("P-256");
    expect(privateKey.d).toBeDefined();
  });
});

describe("generateChallenge", () => {
  it("returns challengeId and challenge as UUIDs", () => {
    const { challengeId, challenge } = generateChallenge();
    expect(challengeId).toMatch(/^[0-9a-f-]{36}$/);
    expect(challenge).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("generates unique challengeId and challenge each call", () => {
    const a = generateChallenge();
    const b = generateChallenge();
    expect(a.challengeId).not.toBe(b.challengeId);
    expect(a.challenge).not.toBe(b.challenge);
  });
});

describe("signChallenge / verifySignature", () => {
  it("valid signature verifies successfully", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const { challenge } = generateChallenge();
    const signature = await signChallenge(privateKey, challenge);
    const valid = await verifySignature(publicKey, challenge, signature);
    expect(valid).toBe(true);
  });

  it("tampered challenge fails verification", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const { challenge } = generateChallenge();
    const signature = await signChallenge(privateKey, challenge);
    const valid = await verifySignature(publicKey, challenge + "x", signature);
    expect(valid).toBe(false);
  });

  it("wrong key pair fails verification", async () => {
    const { privateKey } = await generateKeyPair();
    const { publicKey: otherPublicKey } = await generateKeyPair();
    const { challenge } = generateChallenge();
    const signature = await signChallenge(privateKey, challenge);
    const valid = await verifySignature(otherPublicKey, challenge, signature);
    expect(valid).toBe(false);
  });
});

describe("makeVaultAddress", () => {
  it("returns a 40-character hex string", async () => {
    const { publicKey } = await generateKeyPair();
    const address = await makeVaultAddress(publicKey);
    expect(address).toMatch(/^[0-9a-f]{40}$/);
  });

  it("is deterministic for the same key", async () => {
    const { publicKey } = await generateKeyPair();
    const a = await makeVaultAddress(publicKey);
    const b = await makeVaultAddress(publicKey);
    expect(a).toBe(b);
  });
});
