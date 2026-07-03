import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { pool } from "./config/db";
import { redis } from "./config/redis";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`HMS backend listening on port ${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await pool.end();
    redis.disconnect();
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
