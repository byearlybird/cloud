import z from "zod";

export const putBlobSchema = z.object({
	key: z.string(),
	doc: z.string(), // Accept string directly
});

export const getBlobSchema = z.object({
	key: z.string(),
});

export type PutBlobDTO = z.infer<typeof putBlobSchema>;
export type GetBlobDTO = z.infer<typeof getBlobSchema>;
