import type { Collection } from "@byearlybird/starling";
import { mergeCollections } from "@byearlybird/starling";
import { prefixStorage, type Storage } from "unstorage";

export class CollectionService {
	#storage: Storage<Collection>;

	constructor(storage: Storage) {
		this.#storage = prefixStorage<Collection>(storage, "collection");
	}

	async getCollection(userId: string, collection: string) {
		const key = this.#makeKey(userId, collection);
		return this.#storage.get(key);
	}

	async mergeCollection(userId: string, collection: string, data: Collection) {
		const key = this.#makeKey(userId, collection);
		const current = await this.#storage.get(key);

		if (!current) {
			await this.#storage.set(key, data);
			return;
		}

		const { collection: merged } = mergeCollections(current, data);
		await this.#storage.set(key, merged);
	}

	#makeKey(userId: string, collection: string) {
		return `${userId}:${collection}`;
	}
}
