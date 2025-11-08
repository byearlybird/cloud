import { describe, expect, test } from "bun:test";
import { decryptData, encryptData } from "./encryption";
import { generateMasterKey } from "./keys";

describe("encryptData", () => {
	test("encrypts data successfully", async () => {
		const masterKey = await generateMasterKey();
		const data = "Hello, World!";

		const encrypted = await encryptData(data, masterKey);

		// Should be base64 string
		expect(typeof encrypted).toBe("string");
		expect(encrypted.length).toBeGreaterThan(0);

		// Should be different from original data
		expect(encrypted).not.toBe(data);
	});

	test("produces different output each time (due to random IV)", async () => {
		const masterKey = await generateMasterKey();
		const data = "Same data";

		const encrypted1 = await encryptData(data, masterKey);
		const encrypted2 = await encryptData(data, masterKey);

		// Should be different due to random IV
		expect(encrypted1).not.toBe(encrypted2);
	});

	test("handles empty string", async () => {
		const masterKey = await generateMasterKey();
		const data = "";

		const encrypted = await encryptData(data, masterKey);

		expect(typeof encrypted).toBe("string");
		expect(encrypted.length).toBeGreaterThan(0);
	});

	test("handles unicode characters", async () => {
		const masterKey = await generateMasterKey();
		const data = "Hello 世界 🌍";

		const encrypted = await encryptData(data, masterKey);

		expect(typeof encrypted).toBe("string");
		expect(encrypted.length).toBeGreaterThan(0);
	});

	test("handles long strings", async () => {
		const masterKey = await generateMasterKey();
		const data = "a".repeat(10000);

		const encrypted = await encryptData(data, masterKey);

		expect(typeof encrypted).toBe("string");
		expect(encrypted.length).toBeGreaterThan(0);
	});

	test("handles JSON data", async () => {
		const masterKey = await generateMasterKey();
		const obj = { name: "John", age: 30, nested: { foo: "bar" } };
		const data = JSON.stringify(obj);

		const encrypted = await encryptData(data, masterKey);

		expect(typeof encrypted).toBe("string");
		expect(encrypted.length).toBeGreaterThan(0);
	});
});

describe("decryptData", () => {
	test("decrypts data successfully", async () => {
		const masterKey = await generateMasterKey();
		const originalData = "Secret message";

		const encrypted = await encryptData(originalData, masterKey);
		const decrypted = await decryptData(encrypted, masterKey);

		expect(decrypted).toBe(originalData);
	});

	test("handles empty string", async () => {
		const masterKey = await generateMasterKey();
		const originalData = "";

		const encrypted = await encryptData(originalData, masterKey);
		const decrypted = await decryptData(encrypted, masterKey);

		expect(decrypted).toBe(originalData);
	});

	test("handles unicode characters", async () => {
		const masterKey = await generateMasterKey();
		const originalData = "Hello 世界 🌍";

		const encrypted = await encryptData(originalData, masterKey);
		const decrypted = await decryptData(encrypted, masterKey);

		expect(decrypted).toBe(originalData);
	});

	test("handles long strings", async () => {
		const masterKey = await generateMasterKey();
		const originalData = "a".repeat(10000);

		const encrypted = await encryptData(originalData, masterKey);
		const decrypted = await decryptData(encrypted, masterKey);

		expect(decrypted).toBe(originalData);
	});

	test("handles JSON data", async () => {
		const masterKey = await generateMasterKey();
		const obj = { name: "John", age: 30, nested: { foo: "bar" } };
		const originalData = JSON.stringify(obj);

		const encrypted = await encryptData(originalData, masterKey);
		const decrypted = await decryptData(encrypted, masterKey);

		expect(decrypted).toBe(originalData);
		expect(JSON.parse(decrypted)).toEqual(obj);
	});

	test("fails to decrypt with wrong key", async () => {
		const masterKey1 = await generateMasterKey();
		const masterKey2 = await generateMasterKey();
		const data = "Secret message";

		const encrypted = await encryptData(data, masterKey1);

		// Should throw error when decrypting with wrong key
		await expect(decryptData(encrypted, masterKey2)).rejects.toThrow();
	});

	test("fails to decrypt corrupted data", async () => {
		const masterKey = await generateMasterKey();
		const corruptedData = "invalid-base64-data";

		await expect(decryptData(corruptedData, masterKey)).rejects.toThrow();
	});

	test("fails to decrypt tampered data", async () => {
		const masterKey = await generateMasterKey();
		const data = "Secret message";

		const encrypted = await encryptData(data, masterKey);

		// Tamper with the encrypted data (change one character)
		const tampered = `${encrypted.slice(0, -5)}XXXXX`;

		// Should throw error (GCM authentication will fail)
		await expect(decryptData(tampered, masterKey)).rejects.toThrow();
	});
});

describe("end-to-end encryption flow", () => {
	test("encrypt and decrypt various data types", async () => {
		const masterKey = await generateMasterKey();

		const testData = [
			"Simple string",
			"",
			"Unicode: 你好世界 🎉",
			JSON.stringify({ id: 1, name: "Test", nested: { value: true } }),
			"a".repeat(1000),
			"Special chars: !@#$%^&*()_+-=[]{}|;:',.<>?/~`",
		];

		for (const data of testData) {
			const encrypted = await encryptData(data, masterKey);
			const decrypted = await decryptData(encrypted, masterKey);
			expect(decrypted).toBe(data);
		}
	});

	test("multiple encrypt/decrypt operations with same key", async () => {
		const masterKey = await generateMasterKey();

		// Encrypt multiple pieces of data
		const data1 = "Message 1";
		const data2 = "Message 2";
		const data3 = "Message 3";

		const encrypted1 = await encryptData(data1, masterKey);
		const encrypted2 = await encryptData(data2, masterKey);
		const encrypted3 = await encryptData(data3, masterKey);

		// All encrypted values should be different
		expect(encrypted1).not.toBe(encrypted2);
		expect(encrypted2).not.toBe(encrypted3);

		// All should decrypt correctly
		expect(await decryptData(encrypted1, masterKey)).toBe(data1);
		expect(await decryptData(encrypted2, masterKey)).toBe(data2);
		expect(await decryptData(encrypted3, masterKey)).toBe(data3);
	});
});
