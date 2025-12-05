import type { AnyObject, JsonDocument } from "@byearlybird/starling/core";
import { mergeDocuments } from "@byearlybird/starling/core";
import { and, eq } from "drizzle-orm";
import type { db } from "../../db";
import { documents } from "../../db/schema";

export class DocumentService {
	#db: typeof db;

	constructor(database: typeof db) {
		this.#db = database;
	}

	async getDocument(userId: string, documentKey: string) {
		const doc = await this.#db
			.select()
			.from(documents)
			.where(
				and(
					eq(documents.userId, userId),
					eq(documents.documentKey, documentKey),
				),
			)
			.limit(1)
			.then((r) => r.at(0));

		if (!doc) {
			return null;
		}

		// Parse JSON document data
		try {
			return doc.documentData;
		} catch (error) {
			throw new Error(`Failed to parse document data: ${error}`);
		}
	}

	async mergeDocument(
		userId: string,
		documentKey: string,
		data: JsonDocument<AnyObject>,
	) {
		const current = await this.getDocument(userId, documentKey);

		let finalDocument: JsonDocument<AnyObject>;
		if (!current) {
			finalDocument = data;
		} else {
			const result = mergeDocuments(current, data);
			finalDocument = result.document;
		}

		const id = crypto.randomUUID();

		// Upsert document with atomic conflict resolution
		await this.#db
			.insert(documents)
			.values({
				id,
				userId,
				documentKey,
				documentData: finalDocument,
			})
			.onConflictDoUpdate({
				target: [documents.userId, documents.documentKey],
				set: {
					documentData: finalDocument,
					updatedAt: new Date().toISOString(),
				},
			});
	}
}
