import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { AnyObject, JsonDocument } from "@byearlybird/starling/core";
import { cleanupTestDb, createTestDb } from "../../db/test-helpers";
import { DocumentService } from "./service";

describe("DocumentService", () => {
	let db: Awaited<ReturnType<typeof createTestDb>>["db"];
	let sqlite: Awaited<ReturnType<typeof createTestDb>>["sqlite"];
	let documentService: DocumentService;

	beforeEach(async () => {
		const testDb = await createTestDb();
		db = testDb.db;
		sqlite = testDb.sqlite;
		documentService = new DocumentService(db);
	});

	afterEach(() => {
		cleanupTestDb(sqlite);
	});

	// Helper function to create a test document
	const createTestDocument = (eventstamp: string): JsonDocument<AnyObject> => ({
		jsonapi: {
			version: "1.1",
		},
		meta: {
			latest: eventstamp,
		},
		data: [
			{
				type: "default",
				id: "doc1",
				attributes: {
					name: "Test Document",
					count: 42,
				},
				meta: {
					eventstamps: {
						name: eventstamp,
						count: eventstamp,
					},
					latest: eventstamp,
					deletedAt: null,
				},
			},
		],
	});

	describe("getDocument", () => {
		const userId = "user-123";
		const documentName = "test-document";

		test("returns document when it exists", async () => {
			const testDocument = createTestDocument("2024-01-01T00:00:00.000Z|0|0");

			// Store the document first
			await documentService.mergeDocument(userId, documentName, testDocument);

			const result = await documentService.getDocument(userId, documentName);

			expect(result).toBeDefined();
			expect(result).toEqual(testDocument);
		});

		test("returns null for non-existent document", async () => {
			const result = await documentService.getDocument(
				userId,
				"nonexistent-document",
			);

			expect(result).toBeNull();
		});

		test("different users have separate documents", async () => {
			const user1 = "user-1";
			const user2 = "user-2";
			const document1 = createTestDocument("2024-01-01T00:00:00.000Z|0|0");
			const document2 = createTestDocument("2024-01-02T00:00:00.000Z|0|0");

			await documentService.mergeDocument(user1, documentName, document1);
			await documentService.mergeDocument(user2, documentName, document2);

			const result1 = await documentService.getDocument(user1, documentName);
			const result2 = await documentService.getDocument(user2, documentName);

			expect(result1).toEqual(document1);
			expect(result2).toEqual(document2);
			expect(result1).not.toEqual(result2);
		});
	});

	describe("mergeDocument", () => {
		const userId = "user-123";
		const documentName = "test-document";

		test("creates new document when none exists", async () => {
			const testDocument = createTestDocument("2024-01-01T00:00:00.000Z|0|0");

			await documentService.mergeDocument(userId, documentName, testDocument);

			const result = await documentService.getDocument(userId, documentName);

			expect(result).toEqual(testDocument);
		});

		test("merges with existing document", async () => {
			const document1: JsonDocument<AnyObject> = {
				jsonapi: { version: "1.1" },
				meta: { latest: "2024-01-01T00:00:00.000Z|0|0" },
				data: [
					{
						type: "default",
						id: "doc1",
						attributes: { name: "First Document" },
						meta: {
							eventstamps: { name: "2024-01-01T00:00:00.000Z|0|0" },
							latest: "2024-01-01T00:00:00.000Z|0|0",
							deletedAt: null,
						},
					},
				],
			};

			const document2: JsonDocument<AnyObject> = {
				jsonapi: { version: "1.1" },
				meta: { latest: "2024-01-02T00:00:00.000Z|0|0" },
				data: [
					{
						type: "default",
						id: "doc2",
						attributes: { name: "Second Document" },
						meta: {
							eventstamps: { name: "2024-01-02T00:00:00.000Z|0|0" },
							latest: "2024-01-02T00:00:00.000Z|0|0",
							deletedAt: null,
						},
					},
				],
			};

			await documentService.mergeDocument(userId, documentName, document1);
			await documentService.mergeDocument(userId, documentName, document2);

			const result = await documentService.getDocument(userId, documentName);

			expect(result).toBeDefined();
			if (result) {
				// After merge, should have both documents
				expect(result.data.length).toBe(2);
				// Latest eventstamp should be used
				expect(result.meta.latest).toBe("2024-01-02T00:00:00.000Z|0|0");
			}
		});

		test("merges conflicting updates using CRDT logic", async () => {
			const document1: JsonDocument<AnyObject> = {
				jsonapi: { version: "1.1" },
				meta: { latest: "2024-01-01T00:00:00.000Z|0|0" },
				data: [
					{
						type: "default",
						id: "doc1",
						attributes: { name: "Old Value" },
						meta: {
							eventstamps: { name: "2024-01-01T00:00:00.000Z|0|0" },
							latest: "2024-01-01T00:00:00.000Z|0|0",
							deletedAt: null,
						},
					},
				],
			};

			const document2: JsonDocument<AnyObject> = {
				jsonapi: { version: "1.1" },
				meta: { latest: "2024-01-02T00:00:00.000Z|0|0" },
				data: [
					{
						type: "default",
						id: "doc1",
						attributes: { name: "New Value" },
						meta: {
							eventstamps: { name: "2024-01-02T00:00:00.000Z|0|0" },
							latest: "2024-01-02T00:00:00.000Z|0|0",
							deletedAt: null,
						},
					},
				],
			};

			await documentService.mergeDocument(userId, documentName, document1);
			await documentService.mergeDocument(userId, documentName, document2);

			const result = await documentService.getDocument(userId, documentName);

			expect(result).toBeDefined();
			if (result) {
				// Should only have one document with the newer value
				expect(result.data.length).toBe(1);
				const doc = result.data[0];
				if (doc?.attributes && "name" in doc.attributes) {
					expect(doc.attributes.name).toBe("New Value");
				}
			}
		});

		test("handles empty document arrays", async () => {
			const emptyDocument: JsonDocument<AnyObject> = {
				jsonapi: { version: "1.1" },
				meta: { latest: "2024-01-01T00:00:00.000Z|0|0" },
				data: [],
			};

			await documentService.mergeDocument(userId, documentName, emptyDocument);

			const result = await documentService.getDocument(userId, documentName);

			expect(result).toEqual(emptyDocument);
		});

		test("handles deleted documents", async () => {
			const documentWithDeleted: JsonDocument<AnyObject> = {
				jsonapi: { version: "1.1" },
				meta: { latest: "2024-01-02T00:00:00.000Z|0|0" },
				data: [
					{
						type: "default",
						id: "doc1",
						attributes: { name: "Deleted Document" },
						meta: {
							eventstamps: { name: "2024-01-01T00:00:00.000Z|0|0" },
							latest: "2024-01-02T00:00:00.000Z|0|0",
							deletedAt: "2024-01-02T00:00:00.000Z|0|0",
						},
					},
				],
			};

			await documentService.mergeDocument(
				userId,
				documentName,
				documentWithDeleted,
			);

			const result = await documentService.getDocument(userId, documentName);

			expect(result).toBeDefined();
			if (result) {
				expect(result.data.length).toBe(1);
				expect(result.data[0]?.meta.deletedAt).toBe(
					"2024-01-02T00:00:00.000Z|0|0",
				);
			}
		});
	});
});
