import type { Collection } from "@byearlybird/starling";
import { mergeCollections } from "@byearlybird/starling";
import type { KVStore } from "../../kv/kv";

export class CollectionService {
	#kv: KVStore;

	constructor(kv: KVStore) {
		this.#kv = kv;
	}

	async getCollection(userId: string, collection: string) {
		const key = this.#makeKey(userId, collection);
		return this.#kv.get<Collection>(key);
	}

	async mergeCollection(userId: string, collection: string, data: Collection) {
		const key = this.#makeKey(userId, collection);
		const current = this.#kv.get<Collection>(key);

		if (!current) {
			this.#kv.set<Collection>(key, data);
			return;
		}

		const { collection: merged } = mergeCollections(current, data);
		this.#kv.set<Collection>(key, merged);
	}

	#makeKey(userId: string, collection: string): string[] {
		return ["collection", userId, collection];
	}
}
