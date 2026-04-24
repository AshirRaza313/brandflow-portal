// ============================================================================
// Environment Variable Validation (Adapted for SQLite dev + PostgreSQL prod)
// ============================================================================

import { z } from "zod";

const envSchema = z.object({
  // ── Required ──
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET must be at least 16 characters"),

  NEXTAUTH_URL: z.string().min(1, "NEXTAUTH_URL is required"),

  // ── Optional (for production PostgreSQL) ──
  DIRECT_DATABASE_URL: z.string().optional(),

  // ── Optional but important ──
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email address").optional().default(""),

  // ── Optional: Push Notifications ──
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

let _validatedEnv: EnvSchema | null = null;

export function validateEnv(): EnvSchema {
  if (_validatedEnv) return _validatedEnv;

  const result = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  });

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    if (process.env.NODE_ENV === "development") {
      console.error("\n" + "=".repeat(60));
      console.error("ENVIRONMENT VARIABLE VALIDATION FAILED");
      console.error("=".repeat(60));
      console.error(errors);
      console.error("=".repeat(60) + "\n");
    }

    _validatedEnv = result.data as EnvSchema;
    return _validatedEnv;
  }

  _validatedEnv = result.data;
  return _validatedEnv;
}

export function getEnvVar<K extends keyof EnvSchema>(key: K): EnvSchema[K] {
  return validateEnv()[key];
}
