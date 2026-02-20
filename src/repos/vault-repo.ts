import { db } from "../db/client";
import { NewVault, vaultSchema } from "../db/schema";

export const vaultRepo = {
  create: async (data: NewVault) => {
    const validated = vaultSchema.parse(data);
    const { address } = await db
      .insertInto("vault")
      .values(validated)
      .returning("address")
      .executeTakeFirstOrThrow();

    return address;
  },
  get: async (address: string) => {
    const vault = await db
      .selectFrom("vault")
      .where("address", "=", address)
      .selectAll()
      .executeTakeFirst();

    return vault;
  },
};

export type VaultRepo = typeof vaultRepo;
