import { z } from "zod";

/**
 * Zod schema for EncodedValue<T>
 * A primitive value wrapped with its eventstamp for Last-Write-Wins conflict resolution
 */
export const encodedValueSchema = z.object({
	"~value": z.unknown(),
	"~eventstamp": z.string(),
});

/**
 * Zod schema for EncodedRecord
 * A nested object structure where each field is either an EncodedValue or another EncodedRecord
 */
export const encodedRecordSchema: z.ZodType<{
	[key: string]: z.infer<typeof encodedValueSchema> | any;
}> = z.lazy(() =>
	z.record(z.union([encodedValueSchema, encodedRecordSchema])),
);

/**
 * Zod schema for EncodedDocument
 * Represents a document with unique ID, data, and optional deletion timestamp
 */
export const encodedDocumentSchema = z.object({
	/** Unique identifier for this document */
	"~id": z.string(),
	/** The document's data, either a primitive value or nested object structure */
	"~data": z.union([encodedValueSchema, encodedRecordSchema]),
	/** Eventstamp when this document was soft-deleted, or null if not deleted */
	"~deletedAt": z.string().nullable(),
});

/**
 * Zod schema for Collection
 * Represents a collection of documents with an eventstamp
 */
export const collectionSchema = z.object({
	"~docs": z.array(encodedDocumentSchema),
	"~eventstamp": z.string(),
});

/**
 * Type inference helpers
 */
export type EncodedValue = z.infer<typeof encodedValueSchema>;
export type EncodedRecord = z.infer<typeof encodedRecordSchema>;
export type EncodedDocument = z.infer<typeof encodedDocumentSchema>;
export type CollectionSchema = z.infer<typeof collectionSchema>;
