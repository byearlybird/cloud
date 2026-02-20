import { db } from "../db";
import { Data } from "../db/schema";

export const dataRepo = {
  getByAddressAndType: async (address: string, type: string): Promise<Data | undefined> => {
    return db
      .selectFrom("data")
      .where("address", "=", address)
      .where("type", "=", type)
      .selectAll()
      .executeTakeFirst();
  },
  upsert: async (address: string, type: string, enc_data: string): Promise<void> => {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    await db
      .insertInto("data")
      .values({ id, type, enc_data, timestamp, address })
      .onConflict((oc) => oc.columns(["address", "type"]).doUpdateSet({ enc_data, timestamp }))
      .execute();
  },
};

export type DataRepo = typeof dataRepo;
