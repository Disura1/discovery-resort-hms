import { z } from "zod";

export const createReservationSchema = z
  .object({
    propertyId: z.string().uuid(),
    roomId: z.string().uuid(),
    ratePlanId: z.string().uuid().optional(),
    checkIn: z.string(), // ISO datetime
    checkOut: z.string(),
    // Either an existing guest, or inline details to create one.
    guestId: z.string().uuid().optional(),
    guest: z
      .object({
        fullName: z.string().min(2).max(150),
        email: z.string().email().optional(),
        phone: z.string().min(5).max(30).optional()
      })
      .optional()
  })
  .refine((data) => data.guestId || data.guest, {
    message: "Either guestId or guest details must be provided"
  });

export const updateReservationStatusSchema = z.object({
  status: z.enum(["CANCELLED", "NO_SHOW"])
});

export const listReservationsQuerySchema = z.object({
  propertyId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"]).optional()
});
