import { z } from "zod";
import { assertLocalSqliteUrl } from "./sqlite-url";

const sqliteUrlSchema = z.string().trim().superRefine((value, context) => {
  try {
    assertLocalSqliteUrl(value);
  } catch (error) {
    context.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Invalid SQLite database URL.",
    });
  }
});

const serverEnvSchema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: sqliteUrlSchema,
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  STORAGE_ROOT: z.string().min(1).default("./storage"),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().min(12).optional(),
  TRUST_PROXY: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cachedEnv ??= serverEnvSchema.parse(process.env);
  return cachedEnv;
}

export function parseServerEnv(input: Readonly<Record<string, string | undefined>>): ServerEnv {
  return serverEnvSchema.parse(input);
}

export function resetServerEnvCacheForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Server environment cache can only be reset while running tests.");
  }
  cachedEnv = undefined;
}
