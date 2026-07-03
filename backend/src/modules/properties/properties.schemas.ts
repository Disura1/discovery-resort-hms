import { z } from "zod";

export const createPropertySchema = z.object({
  name: z.string().min(2).max(150),
  address: z.string().min(2),
  timezone: z.string().default("Asia/Colombo"),
  currency: z.string().length(3).default("LKR")
});

export const updatePropertySchema = createPropertySchema.partial();
