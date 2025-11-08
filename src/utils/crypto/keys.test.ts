import { describe, expect, test } from "bun:test";
import {
	decryptMasterKey,
	deriveEncryptionKey,
	encryptMasterKey,
	generateMasterKey,
	generateVaultKey,
} from "./keys";

	describe("generateVaultKey", () => {
		test("generates a vault key in correct format", () => {
			const vaultKey = generateVaultKey();

			// Should be 64 hex chars
			expect(vaultKey).toMatch(/^[a-f0-9]{64}$/);
			expect(vaultKey.length).toBe(64);
		});

	test("generates unique vault keys", () => {
		const key1 = generateVaultKey();
		const key2 = generateVaultKey();

		expect(key1).not.toBe(key2);
	});
});

describe("generateMasterKey", () => {
	test("generates a valid AES-GCM key", async () => {
		const masterKey = await generateMasterKey();

		expect(masterKey.type).toBe("secret");
		expect(masterKey.algorithm.name).toBe("AES-GCM");
		expect((masterKey.algorithm as AesKeyAlgorithm).length).toBe(256);
	});

	test("key is extractable", async () => {
		const masterKey = await generateMasterKey();

		expect(masterKey.extractable).toBe(true);
	});

	test("key has correct usages", async () => {
		const masterKey = await generateMasterKey();

		expect(masterKey.usages).toContain("encrypt");
		expect(masterKey.usages).toContain("decrypt");
	});
});

	describe("deriveEncryptionKey", () => {
	test("derives a valid AES-GCM key from vault key", async () => {
		const vaultKey = "abcd-efgh-ijkl-mnop";
		const { key: encryptionKey, salt } = await deriveEncryptionKey(vaultKey);

		expect(encryptionKey.type).toBe("secret");
		expect(encryptionKey.algorithm.name).toBe("AES-GCM");
		expect((encryptionKey.algorithm as AesKeyAlgorithm).length).toBe(256);
		expect(salt.byteLength).toBeGreaterThan(0);
	});

	test("derives same key from same vault key", async () => {
		const vaultKey = "test-test-test-test";

		const { key: key1, salt } = await deriveEncryptionKey(vaultKey);
		const { key: key2 } = await deriveEncryptionKey(vaultKey, salt);

		// Export both keys to compare
		const exported1 = await crypto.subtle.exportKey("raw", key1);
		const exported2 = await crypto.subtle.exportKey("raw", key2);

		expect(new Uint8Array(exported1)).toEqual(new Uint8Array(exported2));
	});

	test("derives different keys from different vault keys", async () => {
		const vaultKey1 = "aaaa-bbbb-cccc-dddd";
		const vaultKey2 = "eeee-ffff-gggg-hhhh";
		const salt = new Uint8Array(16);
		crypto.getRandomValues(salt);

		const { key: key1 } = await deriveEncryptionKey(vaultKey1, salt);
		const { key: key2 } = await deriveEncryptionKey(vaultKey2, salt);

		// Export both keys to compare
		const exported1 = await crypto.subtle.exportKey("raw", key1);
		const exported2 = await crypto.subtle.exportKey("raw", key2);

		expect(new Uint8Array(exported1)).not.toEqual(new Uint8Array(exported2));
	});

		test("handles vault key regardless of casing", async () => {
			const lowercase = "a".repeat(64);
			const uppercase = lowercase.toUpperCase();
			const salt = new Uint8Array(16);
			crypto.getRandomValues(salt);

			const { key: key1 } = await deriveEncryptionKey(lowercase, salt);
			const { key: key2 } = await deriveEncryptionKey(uppercase, salt);

		// Export both keys to compare
		const exported1 = await crypto.subtle.exportKey("raw", key1);
		const exported2 = await crypto.subtle.exportKey("raw", key2);

		expect(new Uint8Array(exported1)).toEqual(new Uint8Array(exported2));
	});
});

describe("encryptMasterKey and decryptMasterKey", () => {
	test("encrypts and decrypts master key successfully", async () => {
		const vaultKey = "test-test-test-test";
		const masterKey = await generateMasterKey();

		// Export original master key
		const originalBytes = await crypto.subtle.exportKey("raw", masterKey);

		// Encrypt
		const encrypted = await encryptMasterKey(masterKey, vaultKey);

		// Should be base64 string
		expect(typeof encrypted).toBe("string");
		expect(encrypted.length).toBeGreaterThan(0);

		// Decrypt
		const decrypted = await decryptMasterKey(encrypted, vaultKey);

		// Export decrypted key and compare
		const decryptedBytes = await crypto.subtle.exportKey("raw", decrypted);

		expect(new Uint8Array(decryptedBytes)).toEqual(
			new Uint8Array(originalBytes),
		);
	});

	test("encrypted output is different each time (due to random IV)", async () => {
		const vaultKey = "test-test-test-test";
		const masterKey = await generateMasterKey();

		const encrypted1 = await encryptMasterKey(masterKey, vaultKey);
		const encrypted2 = await encryptMasterKey(masterKey, vaultKey);

		// Should be different due to random IV
		expect(encrypted1).not.toBe(encrypted2);

		// But both should decrypt to same key
		const decrypted1 = await decryptMasterKey(encrypted1, vaultKey);
		const decrypted2 = await decryptMasterKey(encrypted2, vaultKey);

		const bytes1 = await crypto.subtle.exportKey("raw", decrypted1);
		const bytes2 = await crypto.subtle.exportKey("raw", decrypted2);

		expect(new Uint8Array(bytes1)).toEqual(new Uint8Array(bytes2));
	});

	test("fails to decrypt with wrong vault key", async () => {
		const vaultKey1 = "aaaa-bbbb-cccc-dddd";
		const vaultKey2 = "eeee-ffff-gggg-hhhh";
		const masterKey = await generateMasterKey();

		const encrypted = await encryptMasterKey(masterKey, vaultKey1);

		// Should throw error when decrypting with wrong key
		await expect(decryptMasterKey(encrypted, vaultKey2)).rejects.toThrow();
	});

	test("fails to decrypt corrupted data", async () => {
		const vaultKey = "test-test-test-test";
		const corruptedData = "invalid-base64-data";

		await expect(decryptMasterKey(corruptedData, vaultKey)).rejects.toThrow();
	});
});

describe("end-to-end key management flow", () => {
	test("complete registration and login flow", async () => {
		// Registration: Generate keys
		const vaultKey = generateVaultKey();
		const masterKey = await generateMasterKey();

		// Registration: Encrypt master key
		const encryptedMasterKey = await encryptMasterKey(masterKey, vaultKey);

		// Server stores: encryptedMasterKey
		// User saves: vaultKey

		// Login: User provides vault key
		const decryptedMasterKey = await decryptMasterKey(
			encryptedMasterKey,
			vaultKey,
		);

		// Verify decrypted key matches original
		const originalBytes = await crypto.subtle.exportKey("raw", masterKey);
		const decryptedBytes = await crypto.subtle.exportKey(
			"raw",
			decryptedMasterKey,
		);

		expect(new Uint8Array(decryptedBytes)).toEqual(
			new Uint8Array(originalBytes),
		);
	});
});
