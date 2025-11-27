import { z } from "zod";

/**
 * Document Schemas
 * Following JSON:API format from @byearlybird/starling v0.11.0+
 */

/**
 * Zod schema for ResourceObject metadata
 */
export const resourceMetaSchema = z.object({
	/** Flat map of dot-separated paths to eventstamps */
	eventstamps: z.record(z.string(), z.string()),
	/** The greatest eventstamp in this resource */
	latest: z.string(),
	/** Eventstamp when this resource was soft-deleted, or null if not deleted */
	deletedAt: z.string().nullable(),
});

/**
 * Zod schema for ResourceObject<T>
 * Represents a single stored entity in JSON:API format
 */
export const resourceObjectSchema = z.object({
	/** Resource type identifier */
	type: z.string(),
	/** Unique identifier for this resource */
	id: z.string(),
	/** The resource's data as a nested object structure */
	attributes: z.record(z.string(), z.unknown()),
	/** Metadata for tracking deletion and eventstamps */
	meta: resourceMetaSchema,
});

/**
 * Zod schema for JsonDocument<T>
 * A JSON:API document representing the complete state of a document
 */
export const documentSchema = z.object({
	/** API version information */
	jsonapi: z.object({
		version: z.literal("1.1"),
	}),
	/** Document-level metadata */
	meta: z.object({
		/** Latest eventstamp observed by this document */
		latest: z.string(),
	}),
	/** Array of resource objects with eventstamps and metadata */
	data: z.array(resourceObjectSchema),
});

/**
 * Type inference helpers
 */
export type ResourceMeta = z.infer<typeof resourceMetaSchema>;
export type ResourceObject = z.infer<typeof resourceObjectSchema>;
export type DocumentSchema = z.infer<typeof documentSchema>;
