import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),

  // Guest portal uses its own token secrets so a guest session can never be
  // mistaken for (or forged into) a staff session, or vice versa.
  JWT_GUEST_ACCESS_SECRET: z.string().min(16, "JWT_GUEST_ACCESS_SECRET must be at least 16 characters"),
  JWT_GUEST_REFRESH_SECRET: z.string().min(16, "JWT_GUEST_REFRESH_SECRET must be at least 16 characters"),
  GUEST_ACCESS_TOKEN_TTL: z.string().default("30m"),
  GUEST_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(90),
  GUEST_OTP_TTL_MINUTES: z.coerce.number().default(10),

  // SMTP is optional in development: if SMTP_HOST is unset, the mailer logs
  // the email content (including OTP codes) to the console instead of
  // sending it, so the login flow can be exercised without a real mailbox.
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("Grand Lotus Hotel <no-reply@grandlotus.test>"),
  SMTP_SECURE: z.coerce.boolean().default(false),

  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  CORS_ORIGIN: z.string().default("*")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
