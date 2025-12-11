import z from "zod";

const resourceObjectMetaSchema = z.object({
	eventstamps: z.record(z.string(), z.string()),
	latest: z.string(),
	deletedAt: z.string().nullable(),
});

const resourceObjectSchema = z.object({
	id: z.string(),
	attributes: z.record(z.string(), z.unknown()),
	meta: resourceObjectMetaSchema,
});

const starlingDocumentSchema = z.object({
	type: z.string(),
	latest: z.string(),
	resources: z.record(z.string(), resourceObjectSchema),
});

export const mergeDocSchema = z.object({
	key: z.string(),
	doc: starlingDocumentSchema,
});

export const getDocSchema = z.object({
	key: z.string(),
});

export type MergeDocDTO = z.infer<typeof mergeDocSchema>;
export type GetDocDTO = z.infer<typeof getDocSchema>;
