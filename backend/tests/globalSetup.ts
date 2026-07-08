/// <reference types="node" />
import { execSync } from "child_process"; // Node.js built-in module
import type { Config } from '@jest/types';

export default async () => {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/hms_test";
  // Reset the schema so tests always start from a clean, known state.
  execSync(
    `psql "${process.env.DATABASE_URL}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS btree_gist;"`,
    { stdio: "inherit" }
  );
  execSync("npx tsx scripts/migrate.ts", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
  });
};
