import { Router, Request, Response } from "express";
import { paymentGateway } from "./paymentGateway";
import { foliosService } from "../folios/folios.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";

const router = Router();

router.post(
  "/payment-gateway",
  asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      throw AppError.badRequest("Missing Stripe-Signature header");
    }

    let event;
    try {
      // req.body is the raw Buffer here because this route is mounted with
      // express.raw() in app.ts, ahead of the global express.json() parser.
      event = paymentGateway.verifyWebhookSignature(req.body, signature);
    } catch (err) {
      logger.warn({ err }, "Stripe webhook signature verification failed");
      throw AppError.badRequest("Invalid webhook signature");
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as { id: string };
        await foliosService.handleGatewayEvent(intent.id, true);
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as { id: string };
        await foliosService.handleGatewayEvent(intent.id, false);
        break;
      }
      default:
        logger.debug({ type: event.type }, "Unhandled Stripe webhook event type");
    }

    res.json({ received: true });
  })
);

export default router;
