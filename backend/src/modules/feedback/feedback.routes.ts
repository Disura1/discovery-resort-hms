import { Router, Request, Response } from "express";
import { z } from "zod";
import { feedbackRepository } from "./feedback.repository";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";

const router = Router();

const listQuerySchema = z.object({ propertyId: z.string().uuid() });

router.get(
  "/",
  authenticate,
  authorize("MANAGER"),
  validate(listQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { propertyId } = req.query as unknown as { propertyId: string };
    const feedback = await feedbackRepository.listByProperty(propertyId);
    res.json({ feedback });
  })
);

export default router;
