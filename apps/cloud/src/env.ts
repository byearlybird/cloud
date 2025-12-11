import { z } from "zod";

const envSchema = z.object({
	ACCESS_TOKEN_SECRET: z.string().min(8, "ACCESS_TOKEN_SECRET is required"),
	REFRESH_TOKEN_SECRET: z.string().min(8, "REFRESH_TOKEN_SECRET is required"),
	// Token expiry times in seconds
	ACCESS_TOKEN_EXPIRY: z.coerce
		.number()
		.positive()
		.default(15 * 60), // 15 minutes
	REFRESH_TOKEN_EXPIRY: z.coerce
		.number()
		.positive()
		.default(7 * 24 * 60 * 60), // 7 days
	// Database
	DATABASE_PATH: z.string(),
	// CORS
	ALLOWED_ORIGINS: z
		.string()
		.default("http://localhost:3000,http://localhost:5173"),
});

export const env = envSchema.parse(Bun.env);
