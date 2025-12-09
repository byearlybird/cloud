import type { Result } from "@/shared/result";
import type { AnyJsonDoc } from "@/shared/types";

import { mergeDocument } from "./document.domain";
import type { DocumentRepo } from "./document.repo";
import type { GetDocDTO, MergeDocDTO } from "./document.schema";

export type DocumentService = {
	get: (userId: string, dto: GetDocDTO) => Promise<Result<AnyJsonDoc | null>>;
	merge: (userId: string, dto: MergeDocDTO) => Promise<Result<void>>;
};

export function createDocumentService(repo: DocumentRepo): DocumentService {
	return {
		get(userId, dto) {
			return repo.get(userId, dto.key);
		},

		async merge(userId, dto) {
			const current = await repo.get(userId, dto.key);

			if (!current.ok) {
				return current;
			}

			if (current.value) {
				const merged = mergeDocument(current.value, dto.doc);
				return repo.update(userId, dto.key, merged);
			}

			return repo.insert(userId, dto.key, dto.doc);
		},
	};
}
