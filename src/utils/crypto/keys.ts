/**
 * Cryptographic key management utilities
 * Uses Web Crypto API for all operations
 */

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_SALT_LENGTH = 16; // 128-bit salt for PBKDF2
const VAULT_KEY_LENGTH = 32; // 256 bits for vault key entropy
const IV_LENGTH = 12; // AES-GCM standard IV length

type DerivedKeyResult = {
	key: CryptoKey;
	salt: Uint8Array;
};

/**
 * Generates a random vault key (hex-encoded string)
 */
export function generateVaultKey(): string {
	const bytes = new Uint8Array(VAULT_KEY_LENGTH);
	crypto.getRandomValues(bytes);

	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Generates a random 256-bit master key for data encryption
 * @returns CryptoKey for AES-GCM encryption
 */
export async function generateMasterKey(): Promise<CryptoKey> {
	return await crypto.subtle.generateKey(
		{
			name: "AES-GCM",
			length: 256,
		},
		true, // extractable
		["encrypt", "decrypt"],
	);
}

/**
 * Derives an encryption key from a vault key using PBKDF2.
 * Generates a random salt unless one is provided (for decrypting existing data).
 * @param vaultKey - The vault key string
 * @param salt - Optional salt to reuse (e.g. when decrypting)
 * @returns Derived AES-GCM key and the salt that was used
 */
export async function deriveEncryptionKey(
	vaultKey: string,
	salt?: Uint8Array,
): Promise<DerivedKeyResult> {
		// Normalize casing (keys are hex strings)
		const normalizedKey = vaultKey.toLowerCase();

	// Convert to ArrayBuffer
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		encoder.encode(normalizedKey),
		{ name: "PBKDF2" },
		false,
		["deriveKey"],
	);

	// Use caller-provided salt or generate a new random one
	const saltBytes = salt
		? new Uint8Array(salt)
		: (() => {
				const randomSalt = new Uint8Array(PBKDF2_SALT_LENGTH);
				crypto.getRandomValues(randomSalt);
				return randomSalt;
		  })();

	const key = await crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: saltBytes,
			iterations: PBKDF2_ITERATIONS,
			hash: "SHA-256",
		},
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		true, // extractable for validation/debugging
		["encrypt", "decrypt"],
	);

	return { key, salt: saltBytes };
}

/**
 * Encrypts a master key with a vault key.
 * Payload layout: salt || iv || ciphertext (all base64 encoded).
 * @param masterKey - The master key to encrypt
 * @param vaultKey - The vault key to encrypt with
 * @returns Base64-encoded payload containing salt, IV, and ciphertext
 */
export async function encryptMasterKey(
	masterKey: CryptoKey,
	vaultKey: string,
): Promise<string> {
	// Export master key to raw bytes
	const masterKeyBytes = await crypto.subtle.exportKey("raw", masterKey);

	// Derive encryption key (captures salt for output)
	const { key: encryptionKey, salt } = await deriveEncryptionKey(vaultKey);

	// Generate random IV
	const iv = new Uint8Array(IV_LENGTH);
	crypto.getRandomValues(iv);

	// Encrypt master key
	const encrypted = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		encryptionKey,
		masterKeyBytes,
	);

	// Combine salt + IV + encrypted data
	const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
	combined.set(salt, 0);
	combined.set(iv, salt.length);
	combined.set(new Uint8Array(encrypted), salt.length + iv.length);

	// Return as base64
	return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts an encrypted master key using a vault key.
 * Expects payload layout salt || iv || ciphertext (base64 encoded).
 * @param encryptedMasterKey - Base64 payload containing salt, IV, and ciphertext
 * @param vaultKey - The vault key to decrypt with
 * @returns Decrypted master key as CryptoKey
 */
export async function decryptMasterKey(
	encryptedMasterKey: string,
	vaultKey: string,
): Promise<CryptoKey> {
	// Decode from base64
	const combined = Uint8Array.from(atob(encryptedMasterKey), (c) =>
		c.charCodeAt(0),
	);

	if (combined.length <= PBKDF2_SALT_LENGTH + IV_LENGTH) {
		throw new Error("Invalid encrypted master key payload");
	}

	// Extract salt, IV, and encrypted data
	const salt = combined.slice(0, PBKDF2_SALT_LENGTH);
	const iv = combined.slice(PBKDF2_SALT_LENGTH, PBKDF2_SALT_LENGTH + IV_LENGTH);
	const encrypted = combined.slice(PBKDF2_SALT_LENGTH + IV_LENGTH);

	// Derive encryption key from vault key using stored salt
	const { key: encryptionKey } = await deriveEncryptionKey(vaultKey, salt);

	// Decrypt master key
	const decrypted = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		encryptionKey,
		encrypted,
	);

	// Import as CryptoKey
	return await crypto.subtle.importKey(
		"raw",
		decrypted,
		{ name: "AES-GCM" },
		true,
		["encrypt", "decrypt"],
	);
}
