import { beforeEach, describe, expect, test } from "bun:test";
import type { Collection } from "@byearlybird/starling";
import { createStorage, type Storage } from "unstorage";
import { CollectionService } from "./service";

describe("CollectionService", () => {
	let storage: Storage;
	let collectionService: CollectionService;

	beforeEach(() => {
		storage = createStorage();
		collectionService = new CollectionService(storage);
	});

	// Helper function to create a test collection
	const createTestCollection = (eventstamp: string): Collection => ({
		"~docs": [
			{
				"~id": "doc1",
				"~data": {
					name: {
						"~value": "Test Document",
						"~eventstamp": eventstamp,
					},
					count: {
						"~value": 42,
						"~eventstamp": eventstamp,
					},
				},
				"~deletedAt": null,
			},
		],
		"~eventstamp": eventstamp,
	});

	describe("getCollection", () => {
		const userId = "user-123";
		const collectionName = "test-collection";

		test("returns collection when it exists", async () => {
			const testCollection = createTestCollection(
				"2024-01-01T00:00:00.000Z|0|0",
			);

			// Store the collection first
			await collectionService.mergeCollection(
				userId,
				collectionName,
				testCollection,
			);

			const result = await collectionService.getCollection(
				userId,
				collectionName,
			);

			expect(result).toBeDefined();
			expect(result).toEqual(testCollection);
		});

		test("returns null for non-existent collection", async () => {
			const result = await collectionService.getCollection(
				userId,
				"nonexistent-collection",
			);

			expect(result).toBeNull();
		});

		test("different users have separate collections", async () => {
			const user1 = "user-1";
			const user2 = "user-2";
			const collection1 = createTestCollection("2024-01-01T00:00:00.000Z|0|0");
			const collection2 = createTestCollection("2024-01-02T00:00:00.000Z|0|0");

			await collectionService.mergeCollection(
				user1,
				collectionName,
				collection1,
			);
			await collectionService.mergeCollection(
				user2,
				collectionName,
				collection2,
			);

			const result1 = await collectionService.getCollection(
				user1,
				collectionName,
			);
			const result2 = await collectionService.getCollection(
				user2,
				collectionName,
			);

			expect(result1).toEqual(collection1);
			expect(result2).toEqual(collection2);
			expect(result1).not.toEqual(result2);
		});
	});

	describe("mergeCollection", () => {
		const userId = "user-123";
		const collectionName = "test-collection";

		test("creates new collection when none exists", async () => {
			const testCollection = createTestCollection(
				"2024-01-01T00:00:00.000Z|0|0",
			);

			await collectionService.mergeCollection(
				userId,
				collectionName,
				testCollection,
			);

			const result = await collectionService.getCollection(
				userId,
				collectionName,
			);

			expect(result).toEqual(testCollection);
		});

		test("merges with existing collection", async () => {
			const collection1: Collection = {
				"~docs": [
					{
						"~id": "doc1",
						"~data": {
							name: {
								"~value": "First Document",
								"~eventstamp": "2024-01-01T00:00:00.000Z|0|0",
							},
						},
						"~deletedAt": null,
					},
				],
				"~eventstamp": "2024-01-01T00:00:00.000Z|0|0",
			};

			const collection2: Collection = {
				"~docs": [
					{
						"~id": "doc2",
						"~data": {
							name: {
								"~value": "Second Document",
								"~eventstamp": "2024-01-02T00:00:00.000Z|0|0",
							},
						},
						"~deletedAt": null,
					},
				],
				"~eventstamp": "2024-01-02T00:00:00.000Z|0|0",
			};

			await collectionService.mergeCollection(
				userId,
				collectionName,
				collection1,
			);
			await collectionService.mergeCollection(
				userId,
				collectionName,
				collection2,
			);

			const result = await collectionService.getCollection(
				userId,
				collectionName,
			);

			expect(result).toBeDefined();
			if (result) {
				// After merge, should have both documents
				expect(result["~docs"].length).toBe(2);
				// Latest eventstamp should be used
				expect(result["~eventstamp"]).toBe("2024-01-02T00:00:00.000Z|0|0");
			}
		});

		test("merges conflicting updates using CRDT logic", async () => {
			const collection1: Collection = {
				"~docs": [
					{
						"~id": "doc1",
						"~data": {
							name: {
								"~value": "Old Value",
								"~eventstamp": "2024-01-01T00:00:00.000Z|0|0",
							},
						},
						"~deletedAt": null,
					},
				],
				"~eventstamp": "2024-01-01T00:00:00.000Z|0|0",
			};

			const collection2: Collection = {
				"~docs": [
					{
						"~id": "doc1",
						"~data": {
							name: {
								"~value": "New Value",
								"~eventstamp": "2024-01-02T00:00:00.000Z|0|0",
							},
						},
						"~deletedAt": null,
					},
				],
				"~eventstamp": "2024-01-02T00:00:00.000Z|0|0",
			};

			await collectionService.mergeCollection(
				userId,
				collectionName,
				collection1,
			);
			await collectionService.mergeCollection(
				userId,
				collectionName,
				collection2,
			);

			const result = await collectionService.getCollection(
				userId,
				collectionName,
			);

			expect(result).toBeDefined();
			if (result) {
				// Should only have one document with the newer value
				expect(result["~docs"].length).toBe(1);
				const doc = result["~docs"][0];
				if (doc && typeof doc["~data"] === "object" && "name" in doc["~data"]) {
					const nameField = doc["~data"].name;
					if (
						nameField &&
						typeof nameField === "object" &&
						"~value" in nameField
					) {
						expect(nameField["~value"]).toBe("New Value");
					}
				}
			}
		});

		test("uses correct storage key format", async () => {
			const testCollection = createTestCollection(
				"2024-01-01T00:00:00.000Z|0|0",
			);

			await collectionService.mergeCollection(
				userId,
				collectionName,
				testCollection,
			);

			// Verify the key format is userId:collectionName with collection prefix
			const storedValue = await storage.getItem(
				`collection:${userId}:${collectionName}`,
			);
			expect(storedValue).toBeDefined();
			expect(storedValue).toEqual(testCollection);
		});

		test("handles empty document arrays", async () => {
			const emptyCollection: Collection = {
				"~docs": [],
				"~eventstamp": "2024-01-01T00:00:00.000Z|0|0",
			};

			await collectionService.mergeCollection(
				userId,
				collectionName,
				emptyCollection,
			);

			const result = await collectionService.getCollection(
				userId,
				collectionName,
			);

			expect(result).toEqual(emptyCollection);
		});

		test("handles deleted documents", async () => {
			const collectionWithDeleted: Collection = {
				"~docs": [
					{
						"~id": "doc1",
						"~data": {
							name: {
								"~value": "Deleted Document",
								"~eventstamp": "2024-01-01T00:00:00.000Z|0|0",
							},
						},
						"~deletedAt": "2024-01-02T00:00:00.000Z|0|0",
					},
				],
				"~eventstamp": "2024-01-02T00:00:00.000Z|0|0",
			};

			await collectionService.mergeCollection(
				userId,
				collectionName,
				collectionWithDeleted,
			);

			const result = await collectionService.getCollection(
				userId,
				collectionName,
			);

			expect(result).toBeDefined();
			if (result) {
				expect(result["~docs"].length).toBe(1);
				expect(result["~docs"][0]?.["~deletedAt"]).toBe(
					"2024-01-02T00:00:00.000Z|0|0",
				);
			}
		});
	});
});
