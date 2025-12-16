import type { KV } from "@/db/kv";
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

export function createDocumentRepo(kv: KV): DocumentRepo {
	return {
		async get(userId, key) {
			const entry = await kv.get<AnyJsonDoc>(["documents", userId, key]);
			return entry.value;
		},

		async insert(userId, key, doc) {
			await kv.set(["documents", userId, key], doc);
		},

		async update(userId, key, doc) {
			await kv.set(["documents", userId, key], doc);
		},
	};
}
