import { z } from "zod";

export const addLineItemSchema = z.object({
  description: z.string().min(2).max(200),
  amount: z.number().refine((v) => v !== 0, "amount must not be zero")
});

export const recordPaymentSchema = z.object({
  method: z.enum(["CARD", "CASH", "BANK_TRANSFER"]),
  amount: z.number().positive(),
  idempotencyKey: z.string().min(8).max(150)
});
