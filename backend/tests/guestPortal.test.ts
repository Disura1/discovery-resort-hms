/// <reference types="node" />

import { execSync } from "child_process";
import fs from "fs";

function getPsqlCommand() {
  if (process.env.PSQL_PATH) {
    return `"${process.env.PSQL_PATH}"`;
  }

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
    "postgresql://postgres:postgres@localhost:5432/hms_test";

  process.env.DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = "test";
  process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379/1";
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET || "test-secret-access-token-key";
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || "test-secret-refresh-token-key";
  process.env.JWT_GUEST_ACCESS_SECRET =
    process.env.JWT_GUEST_ACCESS_SECRET || "test-secret-guest-access-key";
  process.env.JWT_GUEST_REFRESH_SECRET =
    process.env.JWT_GUEST_REFRESH_SECRET || "test-secret-guest-refresh-key";

  const psql = getPsqlCommand();

  execSync(
    `${psql} "${databaseUrl}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS btree_gist;"`,
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