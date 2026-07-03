import { z } from "zod";

export const requestOtpSchema = z.object({
  email: z.string().email()
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d+$/, "Code must be 6 digits"),
  // Only used the first time a guest logs in with a brand-new email, so we
  // have a name to put on the guest record and on the room they book.
  fullName: z.string().min(2).max(150).optional()
});

export const guestRefreshSchema = z.object({
  refreshToken: z.string().min(10).optional()
});
