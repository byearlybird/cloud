export async function generateKeyPair(): Promise<{
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}> {
  const keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
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

export function generateChallenge(): { challengeId: string; challenge: string } {
  return { challengeId: crypto.randomUUID(), challenge: crypto.randomUUID() };
}

export async function signChallenge(privateKey: JsonWebKey, challenge: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "jwk",
    privateKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(challenge),
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function verifySignature(
  publicKey: JsonWebKey,
  challenge: string,
  signature: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "jwk",
    publicKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    sigBytes,
    new TextEncoder().encode(challenge),
  );
}
