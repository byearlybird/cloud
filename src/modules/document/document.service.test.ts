import { describe, expect, test } from "bun:test";

import { Result } from "@/shared/result";
import type { AnyJsonDoc } from "@/shared/types";

import { mergeDocument } from "./document.domain";
import type { DocumentRepo } from "./document.repo";
import type { MergeDocDTO } from "./document.schema";
import { createDocumentService } from "./document.service";

const userId = "user-123";
const documentKey = "settings";

function buildDocument(content: string, latest: string): MergeDocDTO["doc"] {
	return {
		jsonapi: { version: "1.1" },
		meta: { latest },
		data: [
			{
				type: "note",
				id: "note-1",
				attributes: { body: content },
				meta: {
					eventstamps: { client: latest },
					latest,
					deletedAt: null,
				},
			},
		],
	};
}

describe("document.service", () => {
	test("get returns the repository result", async () => {
		const storedDoc = buildDocument("existing", "1") as AnyJsonDoc;

		const repo: DocumentRepo = {
			async get(requestedUserId, key) {
				expect(requestedUserId).toBe(userId);
				expect(key).toBe(documentKey);
				return Result.ok<AnyJsonDoc | null>(storedDoc);
			},
			async insert() {
				throw new Error("insert should not be called");
			},
			async update() {
				throw new Error("update should not be called");
			},
		};

		const service = createDocumentService(repo);
		const result = await service.get(userId, { key: documentKey });
		const value = Result.unwrap(result);

		expect(value).toBe(storedDoc);
	});

	test("merge updates existing documents using merged content", async () => {
		const existingDoc = buildDocument("current", "1") as AnyJsonDoc;
		const incomingDoc = buildDocument("next", "2");
		const expectedMerged = mergeDocument(
			existingDoc,
			incomingDoc as AnyJsonDoc,
		);

		let updatedDoc: AnyJsonDoc | null = null;

		const repo: DocumentRepo = {
			async get() {
				return Result.ok<AnyJsonDoc | null>(existingDoc);
			},
			async update(_, key, doc) {
				expect(key).toBe(documentKey);
				updatedDoc = doc;
				return Result.ok<void>(undefined);
			},
			async insert() {
				throw new Error("insert should not run");
			},
		};

		const service = createDocumentService(repo);
		const result = await service.merge(userId, {
			key: documentKey,
			doc: incomingDoc,
		});
		Result.unwrap(result);

		expect(updatedDoc).not.toBeNull();
		expect(updatedDoc as unknown as AnyJsonDoc).toEqual(expectedMerged);
	});

	test("merge inserts documents that do not exist yet", async () => {
		const incomingDoc = buildDocument("fresh", "3");
		let insertedDoc: AnyJsonDoc | null = null;

		const repo: DocumentRepo = {
			async get() {
				return Result.ok<AnyJsonDoc | null>(null);
			},
			async update() {
				throw new Error("update should not run");
			},
			async insert(_, key, doc) {
				expect(key).toBe(documentKey);
				insertedDoc = doc;
				return Result.ok<void>(undefined);
			},
		};

		const service = createDocumentService(repo);
		const result = await service.merge(userId, {
			key: documentKey,
			doc: incomingDoc,
		});
		Result.unwrap(result);

		expect(insertedDoc).not.toBeNull();
		expect(insertedDoc as unknown as AnyJsonDoc).toEqual(incomingDoc);
	});
});
