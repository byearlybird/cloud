/**
 * Data encryption utilities using AES-GCM
 * Uses Web Crypto API for all operations
 */

/**
 * Encrypts data using a master key
 * @param data - The data to encrypt (string)
 * @param masterKey - The master key for encryption
 * @returns Base64-encoded encrypted data with IV prepended
 */
export async function encryptData(
	data: string,
	masterKey: CryptoKey,
): Promise<string> {
	// Convert data to bytes
	const encoder = new TextEncoder();
	const dataBytes = encoder.encode(data);

	// Generate random IV
	const iv = new Uint8Array(12);
	crypto.getRandomValues(iv);

	// Encrypt data
	const encrypted = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		masterKey,
		dataBytes,
	);

	// Prepend IV to encrypted data
	const combined = new Uint8Array(iv.length + encrypted.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(encrypted), iv.length);

	// Return as base64
	return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts data using a master key
 * @param encryptedData - Base64-encoded encrypted data with IV
 * @param masterKey - The master key for decryption
 * @returns Decrypted data as string
 */
export async function decryptData(
	encryptedData: string,
	masterKey: CryptoKey,
): Promise<string> {
	// Decode from base64
	const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

	// Extract IV and encrypted data
	const iv = combined.slice(0, 12);
	const encrypted = combined.slice(12);

	// Decrypt data
	const decrypted = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		masterKey,
		encrypted,
	);

	// Convert bytes to string
	const decoder = new TextDecoder();
	return decoder.decode(decrypted);
}
