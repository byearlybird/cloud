import { db } from "../db";
import { challengeSchema, NewChallenge } from "../db/schema";

export const challengeRepo = {
  create: async (data: NewChallenge) => {
    const validated = challengeSchema.parse(data);

    // Delete expired challenges
    db.deleteFrom("challenges")
      .where("expires_at", "<", new Date().toISOString())
      .execute()
      .catch(() => {});

    // Create new challenge
    await db.insertInto("challenges").values(validated).execute();
  },
  consumeIfValid: async (id: string, vaultAddress: string) => {
    const row = await db
      .deleteFrom("challenges")
      .where("id", "=", id)
      .where("vault_address", "=", vaultAddress)
      .where("expires_at", ">", new Date().toISOString())
      .returning("challenge")
      .executeTakeFirst();

    return row?.challenge;
  },
};

export type ChallengeRepo = typeof challengeRepo;
