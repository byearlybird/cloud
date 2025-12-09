import { mergeDocuments } from "@byearlybird/starling/core";

import type { AnyJsonDoc } from "@/shared/types";

export function mergeDocument(
	current: AnyJsonDoc,
	incoming: AnyJsonDoc,
): AnyJsonDoc {
	return mergeDocuments(current, incoming).document;
}
