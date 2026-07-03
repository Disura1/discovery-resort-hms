import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../config/redis";
import { env } from "../config/env";

export function createRateLimiter(options: { windowMs: number; max: number; keyPrefix: string }) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    // Test suites share a single "IP" across many requests across many test
    // files in the same run, which would otherwise trip this limiter and
    // produce flaky, order-dependent failures unrelated to what's being
    // tested. The rate limiter's own behavior isn't what those tests are
    // verifying, so it's disabled in the test environment.
    skip: () => env.NODE_ENV === "test",
    store: new RedisStore({
      prefix: options.keyPrefix,
      sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1))
    } as ConstructorParameters<typeof RedisStore>[0]),
    message: { error: { code: "TOO_MANY_REQUESTS", message: "Too many requests, please try again later." } }
  });
}

/** Applied to login/refresh endpoints to blunt brute-force and credential-stuffing attempts. */
export const authRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: "rl:auth:" });

/** General API rate limit, generous enough for normal dashboard use. */
export const apiRateLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 300, keyPrefix: "rl:api:" });
