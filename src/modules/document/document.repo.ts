import { and, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { documents } from "@/db/schema";
import type { AnyJsonDoc } from "@/shared/types";

export type DocumentRepo = {
	get: (userId: string, key: string) => Promise<AnyJsonDoc | null>;
	insert: (
		userId: string,
		key: string,
		doc: AnyJsonDoc,
	) => Promise<void>;
	update: (
		userId: string,
		key: string,
		doc: AnyJsonDoc,
	) => Promise<void>;
};

export function createDocumentRepo(db: Database): DocumentRepo {
	return {
		async get(userId, key) {
			const doc = await db
				.select()
				.from(documents)
				.where(
					and(eq(documents.userId, userId), eq(documents.documentKey, key)),
				)
				.limit(1)
				.then((r) => r.at(0));

			return doc?.documentData ?? null;
		},

		async insert(userId, key, doc) {
			await db.insert(documents).values({
				userId,
				documentKey: key,
				documentData: doc,
			});
		},

		async update(userId, key, doc) {
			await db
				.update(documents)
				.set({ documentData: doc })
				.where(
					and(eq(documents.userId, userId), eq(documents.documentKey, key)),
				);
		},
	};
}
