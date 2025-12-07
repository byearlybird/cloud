import type { z } from "zod";
import { newUserSchema } from "@/db/schema";

export const createUserSchema = newUserSchema.pick({
	email: true,
	encryptedMasterKey: true,
	hashedPassword: true,
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;
