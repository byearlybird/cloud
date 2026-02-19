/**
 * Encrypts a string using an RSA-OAEP public key.
 * The public key should be a JWK object as exported from `generateKeyPair`.
 *
 * Returns a base64-encoded ciphertext.
 */
export async function encryptWithPublicKey(
  publicKey: JsonWebKey,
  plaintext: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "jwk",
    publicKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, encoded);
  return btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
}

/**
 * Decrypts a base64-encoded ciphertext using an RSA-OAEP private key.
 * The private key should be a JWK object as exported from `generateKeyPair`.
 */
export async function decryptWithPrivateKey(
  privateKey: JsonWebKey,
  ciphertext: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "jwk",
    privateKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
  const ciphertextBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, key, ciphertextBytes);
  return new TextDecoder().decode(plaintext);
}

export async function generateKeyPair(): Promise<{
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.exportKey("jwk", keyPair.publicKey),
    crypto.subtle.exportKey("jwk", keyPair.privateKey),
  ]);
  return { publicKey, privateKey };
}

export async function makeVaultAddress(publicKey: JsonWebKey): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(publicKey));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash).slice(12))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateChallenge(
  publicKey: JsonWebKey,
): Promise<{ challengeId: string; challenge: string; encryptedChallenge: string }> {
  const challengeId = crypto.randomUUID();

  const challenge = crypto.randomUUID();
  const encryptedChallenge = await encryptWithPublicKey(publicKey, challenge);
  return { challengeId, challenge, encryptedChallenge };
}
