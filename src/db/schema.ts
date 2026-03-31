import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  hashed_password: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type User = z.output<typeof userSchema>;

export const backupSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  data: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Backup = z.output<typeof backupSchema>;
export type NewBackup = z.input<typeof backupSchema>;

export type Database = {
  users: User;
  backups: Backup;
};
