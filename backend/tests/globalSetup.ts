/// <reference types="node" />

import { execSync } from "child_process";
import fs from "fs";

function getPsqlCommand() {
  if (process.env.PSQL_PATH) return `"${process.env.PSQL_PATH}"`;

  const possiblePaths = [
    "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe"
  ];

  const foundPath = possiblePaths.find((p) => fs.existsSync(p));
  return foundPath ? `"${foundPath}"` : "psql";
}

export default async () => {
  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://hms_user:Chathu@localhost:5432/hms_dev";

  process.env.NODE_ENV = "test";
  process.env.PORT = process.env.PORT || "4000";
  process.env.DATABASE_URL = databaseUrl;
  process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379/1";

  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET || "test-secret-access-token-key";
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || "test-secret-refresh-token-key";
  process.env.JWT_GUEST_ACCESS_SECRET =
    process.env.JWT_GUEST_ACCESS_SECRET || "test-secret-guest-access-key";
  process.env.JWT_GUEST_REFRESH_SECRET =
    process.env.JWT_GUEST_REFRESH_SECRET || "test-secret-guest-refresh-key";

  process.env.ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
  process.env.REFRESH_TOKEN_TTL_DAYS =
    process.env.REFRESH_TOKEN_TTL_DAYS || "30";
  process.env.GUEST_ACCESS_TOKEN_TTL =
    process.env.GUEST_ACCESS_TOKEN_TTL || "30m";
  process.env.GUEST_REFRESH_TOKEN_TTL_DAYS =
    process.env.GUEST_REFRESH_TOKEN_TTL_DAYS || "90";
  process.env.GUEST_OTP_TTL_MINUTES =
    process.env.GUEST_OTP_TTL_MINUTES || "10";

  process.env.SMTP_HOST = process.env.SMTP_HOST || "";
  process.env.SMTP_PORT = process.env.SMTP_PORT || "587";
  process.env.SMTP_USER = process.env.SMTP_USER || "";
  process.env.SMTP_PASS = process.env.SMTP_PASS || "";
  process.env.SMTP_FROM =
    process.env.SMTP_FROM ||
    "Discovery-Resort-Muwanthanna <no-reply@discoveryresortmuwanthanna.test>";
  process.env.SMTP_SECURE = process.env.SMTP_SECURE || "false";

  process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
  process.env.STRIPE_WEBHOOK_SECRET =
    process.env.STRIPE_WEBHOOK_SECRET || "";
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

  process.env.S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:9000";
  process.env.S3_REGION = process.env.S3_REGION || "us-east-1";
  process.env.S3_BUCKET = process.env.S3_BUCKET || "hms-media-test";
  process.env.S3_ACCESS_KEY_ID =
    process.env.S3_ACCESS_KEY_ID || "minioadmin";
  process.env.S3_SECRET_ACCESS_KEY =
    process.env.S3_SECRET_ACCESS_KEY || "minioadmin";
  process.env.S3_FORCE_PATH_STYLE =
    process.env.S3_FORCE_PATH_STYLE || "true";
  process.env.S3_PUBLIC_BASE_URL =
    process.env.S3_PUBLIC_BASE_URL ||
    "http://localhost:9000/hms-media-test";

  const psql = getPsqlCommand();

  execSync(
    `${psql} "${databaseUrl}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS btree_gist; CREATE EXTENSION IF NOT EXISTS pgcrypto;"`,
    { stdio: "inherit" }
  );

  execSync("npx tsx scripts/migrate.ts", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl
    }
  });
};