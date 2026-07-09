import pino from "pino";
import { env } from "../config/env";

const isDevelopment = env.NODE_ENV === "development";
const isTest = env.NODE_ENV === "test";

export const logger = pino({
  level: isDevelopment ? "debug" : "info",
  enabled: !isTest
});