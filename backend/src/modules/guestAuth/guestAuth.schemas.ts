import { z } from "zod";

export const registerGuestSchema = z.object({
  fullName: z.string().min(2).max(150),
  email: z.string().email(),
  password: z.string().min(8).max(100)
});

export const guestLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const guestRefreshSchema = z.object({
  refreshToken: z.string().min(10).optional()
});