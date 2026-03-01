import z from "zod";

const envSchema = z.object({
  CLERK_SECRET_KEY: z.string(),
  CLERK_PUBLISHABLE_KEY: z.string(),
  DATABASE_URL: z.string(),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    ),
});

export const env = envSchema.parse(process.env);
