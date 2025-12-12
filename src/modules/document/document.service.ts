import type { AnyJsonDoc } from "@/shared/types";

import { mergeDocument } from "./document.domain";
import type { DocumentRepo } from "./document.repo";
import type { GetDocDTO, MergeDocDTO } from "./document.schema";

export type DocumentService = {
	get: (userId: string, dto: GetDocDTO) => Promise<AnyJsonDoc | null>;
	merge: (userId: string, dto: MergeDocDTO) => Promise<void>;
};

export function createDocumentService(repo: DocumentRepo): DocumentService {
	return {
		get(userId, dto) {
			return repo.get(userId, dto.key);
		},

		async merge(userId, dto) {
			const current = await repo.get(userId, dto.key);

			if (current) {
				const merged = mergeDocument(current, dto.doc);
				await repo.update(userId, dto.key, merged);
			} else {
				await repo.insert(userId, dto.key, dto.doc);
			}
		},
	};
}
