import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { logger } from "./utils/logger";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./modules/auth/auth.routes";
import guestAuthRoutes from "./modules/guestAuth/guestAuth.routes";
import guestRoutes from "./modules/guest/guest.routes";
import feedbackRoutes from "./modules/feedback/feedback.routes";
import propertiesRoutes from "./modules/properties/properties.routes";
import roomsRoutes from "./modules/rooms/rooms.routes";
import guestsRoutes from "./modules/guests/guests.routes";
import reservationsRoutes from "./modules/reservations/reservations.routes";
import foliosRoutes from "./modules/folios/folios.routes";
import webhookRoutes from "./modules/payments/webhook.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import housekeepingRoutes from "./modules/housekeeping/housekeeping.routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
      credentials: true
    })
  );
  app.use(compression());
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== "test" }));

  // Stripe webhook needs the raw request body to verify the signature, so it
  // is mounted BEFORE the global express.json() body parser below.
  app.use("/api/webhooks", express.raw({ type: "application/json" }), webhookRoutes);

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/api", apiRateLimiter);

  app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  app.use("/api/auth", authRoutes);
  app.use("/api/guest-auth", guestAuthRoutes);
  app.use("/api/guest", guestRoutes);
  app.use("/api/feedback", feedbackRoutes);
  app.use("/api/properties", propertiesRoutes);
  app.use("/api", roomsRoutes); // exposes /api/availability, /api/rooms, /api/room-types, /api/rate-plans
  app.use("/api/guests", guestsRoutes);
  app.use("/api/reservations", reservationsRoutes);
  app.use("/api/folios", foliosRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/housekeeping", housekeepingRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
