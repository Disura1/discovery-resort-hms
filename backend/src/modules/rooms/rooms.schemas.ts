import { z } from "zod";

export const createRoomTypeSchema = z.object({
  name: z.string().min(2).max(100),
  baseRate: z.number().positive(),
  maxOccupancy: z.number().int().positive()
});

export const updateRoomTypeSchema = createRoomTypeSchema.partial().extend({
  isActive: z.boolean().optional()
});

export const createRoomSchema = z.object({
  roomTypeId: z.string().uuid(),
  roomNumber: z.string().min(1).max(20)
});

export const updateRoomStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "DIRTY", "INSPECTED", "OUT_OF_ORDER"])
});

export const createRatePlanSchema = z.object({
  roomTypeId: z.string().uuid(),
  name: z.string().min(2).max(100),
  rateMultiplier: z.number().positive().default(1),
  cancellationPolicy: z.string().optional(),
  validFrom: z.string().date().optional(),
  validTo: z.string().date().optional()
});
