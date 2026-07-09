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

  JWT_GUEST_ACCESS_SECRET: z.string().min(16, "JWT_GUEST_ACCESS_SECRET must be at least 16 characters"),
  JWT_GUEST_REFRESH_SECRET: z.string().min(16, "JWT_GUEST_REFRESH_SECRET must be at least 16 characters"),
  GUEST_ACCESS_TOKEN_TTL: z.string().default("30m"),
  GUEST_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(90),
  GUEST_OTP_TTL_MINUTES: z.coerce.number().default(10),

  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("Discovery-Resort-Muwanthanna <no-reply@discoveryresortmuwanthanna.test>"),
  SMTP_SECURE: z.coerce.boolean().default(false),

  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  CORS_ORIGIN: z.string().default("*"),

  // S3 / MinIO media storage
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("hms-media"),
  S3_ACCESS_KEY_ID: z.string().default("minioadmin"),
  S3_SECRET_ACCESS_KEY: z.string().default("minioadmin"),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  S3_PUBLIC_BASE_URL: z.string().default("http://localhost:9000/hms-media")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.log(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;