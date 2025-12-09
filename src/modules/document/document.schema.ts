import z from "zod";

const jsonApiResourceMetaSchema = z.object({
	eventstamps: z.record(z.string(), z.string()),
	latest: z.string(),
	deletedAt: z.string().nullable(),
});

const jsonApiResourceSchema = z.object({
	type: z.string(),
	id: z.string(),
	attributes: z.record(z.string(), z.unknown()),
	meta: jsonApiResourceMetaSchema,
});

const jsonApiDocumentSchema = z.object({
	jsonapi: z.object({
		version: z.literal("1.1"),
	}),
	meta: z.object({
		latest: z.string(),
	}),
	data: z.array(jsonApiResourceSchema),
});

export const mergeDocSchema = z.object({
	key: z.string(),
	doc: jsonApiDocumentSchema,
});

export const getDocSchema = z.object({
	key: z.string(),
});

export type MergeDocDTO = z.infer<typeof mergeDocSchema>;
export type GetDocDTO = z.infer<typeof getDocSchema>;
