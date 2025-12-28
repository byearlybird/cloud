import type { BlobRepo } from "./blob.repo";
import type { GetBlobDTO, PutBlobDTO } from "./blob.schema";

export type BlobService = {
	get: (userId: string, dto: GetBlobDTO) => Promise<string | null>;
	put: (userId: string, dto: PutBlobDTO) => Promise<void>;
};

export function createBlobService(repo: BlobRepo): BlobService {
	return {
		get(userId, dto) {
			return repo.get(userId, dto.key);
		},

		async put(userId, dto) {
			const existing = await repo.get(userId, dto.key);

			if (existing) {
				await repo.update(userId, dto.key, dto.doc);
			} else {
				await repo.insert(userId, dto.key, dto.doc);
			}
		},
	};
}
