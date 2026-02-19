import { describe, expect, it } from "bun:test";
import { decryptWithPrivateKey, encryptWithPublicKey, generateChallenge, generateKeyPair, makeVaultAddress } from "./crypto";

describe("generateKeyPair", () => {
  it("returns RSA JWK key pair", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    expect(publicKey.kty).toBe("RSA");
    expect(publicKey.n).toBeDefined();
    expect(publicKey.e).toBeDefined();
    expect(privateKey.kty).toBe("RSA");
    expect(privateKey.d).toBeDefined(); // private exponent only on private key
  });
});

describe("encryptWithPublicKey / decryptWithPrivateKey", () => {
  it("round-trips plaintext", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const plaintext = "hello world";
    const ciphertext = await encryptWithPublicKey(publicKey, plaintext);
    const decrypted = await decryptWithPrivateKey(privateKey, ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it("ciphertext is a non-empty base64 string", async () => {
    const { publicKey } = await generateKeyPair();
    const ciphertext = await encryptWithPublicKey(publicKey, "test");
    expect(typeof ciphertext).toBe("string");
    expect(ciphertext.length).toBeGreaterThan(0);
  });
});

describe("generateChallenge", () => {
  it("returns challengeId, challenge, and encryptedChallenge", async () => {
    const { publicKey } = await generateKeyPair();
    const { challengeId, challenge, encryptedChallenge } = await generateChallenge(publicKey);
    expect(challengeId).toMatch(/^[0-9a-f-]{36}$/);
    expect(challenge).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof encryptedChallenge).toBe("string");
    expect(encryptedChallenge.length).toBeGreaterThan(0);
  });

  it("encryptedChallenge decrypts back to challenge", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const { challenge, encryptedChallenge } = await generateChallenge(publicKey);
    const decrypted = await decryptWithPrivateKey(privateKey, encryptedChallenge);
    expect(decrypted).toBe(challenge);
  });

  it("generates unique challengeId and challenge each call", async () => {
    const { publicKey } = await generateKeyPair();
    const a = await generateChallenge(publicKey);
    const b = await generateChallenge(publicKey);
    expect(a.challengeId).not.toBe(b.challengeId);
    expect(a.challenge).not.toBe(b.challenge);
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
