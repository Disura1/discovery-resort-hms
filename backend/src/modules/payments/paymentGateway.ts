import Stripe from "stripe";
import { env } from "../../config/env";

// A dummy key is used in local/dev environments where no real Stripe account
// is configured yet; requests will simply fail gracefully if actually invoked.
export const stripeClient = new Stripe(env.STRIPE_SECRET_KEY || "sk_test_dummy", {
  apiVersion: "2026-06-24.dahlia"
});

export const paymentGateway = {
  /**
   * Creates a PaymentIntent for a card payment. The client completes payment
   * using Stripe's hosted Elements/SDK with the returned client secret — card
   * data never passes through our servers.
   */
  async createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>) {
    const intent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects the smallest currency unit
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: { enabled: true }
    });
    return intent;
  },

  verifyWebhookSignature(rawBody: Buffer, signature: string): Stripe.Event {
    return stripeClient.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  }
};
