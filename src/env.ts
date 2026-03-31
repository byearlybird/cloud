import z from "zod";

const envSchema = z.object({
  JWT_SECRET: z.string(),
  JWT_ACCESS_EXPIRY: z.string().optional().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().optional().default("7d"),
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
