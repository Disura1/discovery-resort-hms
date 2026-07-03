import { Router, Request, Response } from "express";
import { z } from "zod";
import { guestsRepository } from "./guests.repository";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { AppError } from "../../utils/AppError";

const createGuestSchema = z.object({
  fullName: z.string().min(2).max(150),
  email: z.string().email().optional(),
  phone: z.string().min(5).max(30).optional(),
  idDocumentType: z.string().max(30).optional(),
  idDocumentNumber: z.string().max(60).optional()
});

const router = Router();

router.post(
  "/",
  validate(createGuestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const guest = await guestsRepository.create(req.body);
    res.status(201).json({ guest });
  })
);

router.get(
  "/search",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const term = String(req.query.q ?? "");
    if (term.length < 2) throw AppError.badRequest("Search term must be at least 2 characters");
    const guests = await guestsRepository.search(term);
    res.json({ guests });
  })
);

router.get(
  "/:guestId",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const guest = await guestsRepository.findById(req.params.guestId);
    if (!guest) throw AppError.notFound("Guest not found");
    const history = await guestsRepository.stayHistory(req.params.guestId);
    res.json({ guest, stayHistory: history });
  })
);

export default router;
