import { z } from "zod";

export const vaultSchema = z.object({
  address: z.string(),
  public_key: z.string(),
  created_at: z.iso.datetime().default(() => new Date().toISOString()),
});

export const challengeSchema = z.object({
  id: z.string(),
  vault_address: z.string(),
  challenge: z.string(),
  expires_at: z.iso.datetime(),
});

export const dataSchema = z.object({
  id: z.string(),
  type: z.string(),
  enc_data: z.string(),
  timestamp: z.iso.datetime().default(() => new Date().toISOString()),
  address: z.string(),
});

export type Vault = z.output<typeof vaultSchema>;
export type NewVault = z.input<typeof vaultSchema>;

export type Challenge = z.output<typeof challengeSchema>;
export type NewChallenge = z.input<typeof challengeSchema>;

export type Data = z.output<typeof dataSchema>;
export type NewData = z.input<typeof dataSchema>;

export type Database = {
  vault: Vault;
  challenges: Challenge;
  data: Data;
};
