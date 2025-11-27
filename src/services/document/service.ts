import type { AnyObject, JsonDocument } from "@byearlybird/starling/core";
import { mergeDocuments } from "@byearlybird/starling/core";
import type { KVStore } from "../../kv/kv";

export class DocumentService {
	#kv: KVStore;

	constructor(kv: KVStore) {
		this.#kv = kv;
	}

	async getDocument(userId: string, document: string) {
		const key = this.#makeKey(userId, document);
		return this.#kv.get<JsonDocument<AnyObject>>(key);
	}

	async mergeDocument(
		userId: string,
		document: string,
		data: JsonDocument<AnyObject>,
	) {
		const key = this.#makeKey(userId, document);
		const current = this.#kv.get<JsonDocument<AnyObject>>(key);

		if (!current) {
			this.#kv.set<JsonDocument<AnyObject>>(key, data);
			return;
		}

		const result = mergeDocuments(current, data);
		this.#kv.set<JsonDocument<AnyObject>>(key, result.document);
	}

	#makeKey(userId: string, document: string): string[] {
		return ["document", userId, document];
	}
}
