import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

export const createStaffSchema = z.object({
  fullName: z.string().min(2).max(150),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["OWNER", "MANAGER", "FRONT_DESK", "HOUSEKEEPING", "ACCOUNTANT"]),
  propertyId: z.string().uuid().nullable().optional()
});
