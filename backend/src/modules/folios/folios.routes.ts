import { Router, Request, Response } from "express";
import { foliosService } from "./folios.service";
import { foliosRepository } from "./folios.repository";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { addLineItemSchema, recordPaymentSchema } from "./folios.schemas";
import { AppError } from "../../utils/AppError";
import { pool } from "../../config/db";

const router = Router();

async function getFolioProperty(folioId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT res.property_id FROM folios f JOIN reservations res ON res.id = f.reservation_id WHERE f.id = $1`,
    [folioId]
  );
  return rows[0]?.property_id ?? null;
}

router.get(
  "/:folioId",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const detail = await foliosService.getDetail(req.params.folioId);
    res.json(detail);
  })
);

router.get(
  "/by-reservation/:reservationId",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const folio = await foliosRepository.findByReservationId(req.params.reservationId);
    if (!folio) throw AppError.notFound("Folio not found for this reservation");
    res.json({ folio });
  })
);

router.post(
  "/:folioId/items",
  authenticate,
  authorize("FRONT_DESK", "MANAGER"),
  validate(addLineItemSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const propertyId = await getFolioProperty(req.params.folioId);
    const item = await foliosService.addLineItem(req.params.folioId, req.body, req.user!.sub, propertyId);
    res.status(201).json({ item });
  })
);

router.post(
  "/:folioId/payments",
  authenticate,
  authorize("FRONT_DESK", "MANAGER", "ACCOUNTANT"),
  validate(recordPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const propertyId = await getFolioProperty(req.params.folioId);
    if (!propertyId) throw AppError.notFound("Folio not found");
    // Currency is resolved from the owning property; defaults to LKR if unset.
    const { rows } = await pool.query(`SELECT currency FROM properties WHERE id = $1`, [propertyId]);
    const currency = rows[0]?.currency ?? "LKR";

    const result = await foliosService.recordPayment(
      req.params.folioId,
      req.body,
      req.user!.sub,
      propertyId,
      currency
    );
    res.status(201).json(result);
  })
);

export default router;
