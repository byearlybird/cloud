import { and, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { blobs } from "@/db/schema";

export type BlobRepo = {
  get: (userId: string, key: string) => Promise<string | null>;
  insert: (userId: string, key: string, doc: string) => Promise<void>;
  update: (userId: string, key: string, doc: string) => Promise<void>;
};

export function createBlobRepo(db: Database): BlobRepo {
  return {
    async get(userId, key) {
      const blob = await db
        .select()
        .from(blobs)
        .where(and(eq(blobs.userId, userId), eq(blobs.blobKey, key)))
        .limit(1)
        .then((r) => r.at(0));

      if (!blob?.blobData) {
        return null;
      }

      // Deserialize BLOB to string
      return blob.blobData.toString("utf-8");
    },

    async insert(userId, key, doc) {
      // Serialize string to Buffer for BLOB storage
      const blobData = Buffer.from(doc, "utf-8");
      await db.insert(blobs).values({
        userId,
        blobKey: key,
        blobData,
      });
    },

    async update(userId, key, doc) {
      // Serialize string to Buffer for BLOB storage
      const blobData = Buffer.from(doc, "utf-8");
      await db
        .update(blobs)
        .set({ blobData })
        .where(and(eq(blobs.userId, userId), eq(blobs.blobKey, key)));
    },
  };
}
