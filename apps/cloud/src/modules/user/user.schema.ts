import z from "zod";

export const createUserSchema = z.object({
	email: z.email(),
	encryptedMasterKey: z.string().min(1),
	hashedPassword: z.string().min(1),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;
