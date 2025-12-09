import { and, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { documents } from "@/db/schema";
import { Result } from "@/shared/result";
import type { AnyJsonDoc } from "@/shared/types";

export type DocumentRepo = {
	get: (userId: string, key: string) => Promise<Result<AnyJsonDoc | null>>;
	insert: (
		userId: string,
		key: string,
		doc: AnyJsonDoc,
	) => Promise<Result<void>>;
	update: (
		userId: string,
		key: string,
		doc: AnyJsonDoc,
	) => Promise<Result<void>>;
};

export function createDocumentRepo(db: Database): DocumentRepo {
	return {
		get(userId, key) {
			return Result.wrapAsync(async () => {
				const doc = await db
					.select()
					.from(documents)
					.where(
						and(eq(documents.userId, userId), eq(documents.documentKey, key)),
					)
					.limit(1)
					.then((r) => r.at(0));

				return doc?.documentData ?? null;
			});
		},

		insert(userId, key, doc) {
			return Result.wrapAsync(async () => {
				await db.insert(documents).values({
					userId,
					documentKey: key,
					documentData: doc,
				});
			});
		},

		update(userId, key, doc) {
			return Result.wrapAsync(async () => {
				await db
					.update(documents)
					.set({ documentData: doc })
					.where(
						and(eq(documents.userId, userId), eq(documents.documentKey, key)),
					);
			});
		},
	};
}
