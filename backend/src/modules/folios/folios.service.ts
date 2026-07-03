import { pool } from "../../config/db";
import { foliosRepository } from "./folios.repository";
import { paymentGateway } from "../payments/paymentGateway";
import { AppError } from "../../utils/AppError";
import { recordAudit } from "../audit/audit.service";

export const foliosService = {
  async getDetail(folioId: string) {
    const folio = await foliosRepository.findById(folioId);
    if (!folio) throw AppError.notFound("Folio not found");
    const [lineItems, payments] = await Promise.all([
      foliosRepository.listLineItems(folioId),
      foliosRepository.listPayments(folioId)
    ]);
    return { folio, lineItems, payments };
  },

  async addLineItem(
    folioId: string,
    input: { description: string; amount: number },
    staffId: string,
    propertyId: string | null
  ) {
    const folio = await foliosRepository.findById(folioId);
    if (!folio) throw AppError.notFound("Folio not found");
    if (folio.status === "CLOSED") throw AppError.conflict("Cannot post charges to a closed folio");

    const item = await foliosRepository.addLineItem(pool, {
      folioId,
      description: input.description,
      amount: input.amount,
      postedBy: staffId
    });

    await recordAudit({
      staffId,
      propertyId,
      action: "folio.line_item.add",
      entityType: "folio",
      entityId: folioId,
      metadata: { description: input.description, amount: input.amount }
    });

    return item;
  },

  /**
   * Records a payment against a folio. Cash/bank transfer payments are
   * considered settled immediately since a staff member is recording money
   * already received. Card payments create a Stripe PaymentIntent; the
   * payment is only marked SUCCEEDED once the webhook confirms it, so the
   * folio balance never reflects an unconfirmed charge.
   */
  async recordPayment(
    folioId: string,
    input: { method: "CARD" | "CASH" | "BANK_TRANSFER"; amount: number; idempotencyKey: string },
    staffId: string,
    propertyId: string | null,
    currency: string
  ) {
    const existing = await foliosRepository.findPaymentByIdempotencyKey(input.idempotencyKey);
    if (existing) return { payment: existing, clientSecret: null };

    const folio = await foliosRepository.findById(folioId);
    if (!folio) throw AppError.notFound("Folio not found");
    if (folio.status === "CLOSED") throw AppError.conflict("Cannot record a payment against a closed folio");

    if (input.method === "CARD") {
      const payment = await foliosRepository.addPayment(pool, {
        folioId,
        method: "CARD",
        amount: input.amount,
        status: "PENDING",
        idempotencyKey: input.idempotencyKey
      });

      const intent = await paymentGateway.createPaymentIntent(input.amount, currency, {
        folioId,
        paymentId: payment.id
      });

      await pool.query(`UPDATE payments SET gateway_reference = $2 WHERE id = $1`, [payment.id, intent.id]);

      return { payment: { ...payment, gateway_reference: intent.id }, clientSecret: intent.client_secret };
    }

    // Cash / bank transfer: staff is confirming money already received.
    const payment = await foliosRepository.addPayment(pool, {
      folioId,
      method: input.method,
      amount: input.amount,
      status: "SUCCEEDED",
      idempotencyKey: input.idempotencyKey
    });

    await recordAudit({
      staffId,
      propertyId,
      action: "folio.payment.record",
      entityType: "payment",
      entityId: payment.id,
      metadata: { method: input.method, amount: input.amount }
    });

    return { payment, clientSecret: null };
  },

  /** Called from the Stripe webhook handler once a PaymentIntent succeeds or fails. */
  async handleGatewayEvent(paymentIntentId: string, succeeded: boolean) {
    const payment = await foliosRepository.findPaymentByGatewayReference(paymentIntentId);
    if (!payment) return; // Not one of ours, or already processed
    await foliosRepository.updatePaymentStatus(payment.id, succeeded ? "SUCCEEDED" : "FAILED");
    await recordAudit({
      staffId: null,
      propertyId: null,
      action: succeeded ? "folio.payment.succeeded" : "folio.payment.failed",
      entityType: "payment",
      entityId: payment.id,
      metadata: { gatewayReference: paymentIntentId }
    });
  }
};
