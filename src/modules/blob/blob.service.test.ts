import { describe, expect, test } from "bun:test";

import type { BlobRepo } from "./blob.repo";
import { createBlobService } from "./blob.service";

const userId = "user-123";
const blobKey = "settings";

function buildBlob(content: string, latest: string): string {
	return JSON.stringify({
		type: "note",
		latest,
		resources: {
			"note-1": {
				id: "note-1",
				attributes: { body: content },
				meta: {
					eventstamps: { body: latest },
					latest,
					deletedAt: null,
				},
			},
		},
	});
}

describe("blob.service", () => {
	test("get returns the repository result", async () => {
		const storedBlob = buildBlob("existing", "1");

		const repo: BlobRepo = {
			async get(requestedUserId, key) {
				expect(requestedUserId).toBe(userId);
				expect(key).toBe(blobKey);
				return storedBlob;
			},
			async insert() {
				throw new Error("insert should not be called");
			},
			async update() {
				throw new Error("update should not be called");
			},
		};

		const service = createBlobService(repo);
		const value = await service.get(userId, { key: blobKey });

		expect(value).toBe(storedBlob);
	});

	test("put replaces existing blobs", async () => {
		const existingBlob = buildBlob("current", "1");
		const newBlob = buildBlob("replaced", "2");

		let updatedBlob: string | null = null;

		const repo: BlobRepo = {
			async get() {
				return existingBlob;
			},
			async update(_, key, doc) {
				expect(key).toBe(blobKey);
				updatedBlob = doc;
			},
			async insert() {
				throw new Error("insert should not run");
			},
		};

		const service = createBlobService(repo);
		await service.put(userId, {
			key: blobKey,
			doc: newBlob,
		});

		expect(updatedBlob).not.toBeNull();
		expect(updatedBlob).toBe(newBlob);
	});

	test("put inserts blobs that do not exist yet", async () => {
		const newBlob = buildBlob("fresh", "3");
		let insertedBlob: string | null = null;

		const repo: BlobRepo = {
			async get() {
				return null;
			},
			async update() {
				throw new Error("update should not run");
			},
			async insert(_, key, doc) {
				expect(key).toBe(blobKey);
				insertedBlob = doc;
			},
		};

		const service = createBlobService(repo);
		await service.put(userId, {
			key: blobKey,
			doc: newBlob,
		});

		expect(insertedBlob).not.toBeNull();
		expect(insertedBlob).toBe(newBlob);
	});
});
