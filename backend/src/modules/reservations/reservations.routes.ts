import { Router, Request, Response } from "express";
import { reservationsService } from "./reservations.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticate } from "../../middleware/authenticate";
import { optionalAuthenticate } from "../../middleware/optionalAuthenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import {
  createReservationSchema,
  updateReservationStatusSchema,
  listReservationsQuerySchema
} from "./reservations.schemas";

const router = Router();

// Guests can create a reservation through the public booking widget without
// authenticating; staff can create one on behalf of a walk-in or phone booking.
router.post(
  "/",
  optionalAuthenticate,
  validate(createReservationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const staffId = req.user?.sub ?? null;
    const result = await reservationsService.create(req.body, staffId);
    res.status(201).json(result);
  })
);

router.get(
  "/",
  authenticate,
  validate(listReservationsQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { propertyId, from, to, status } = req.query as unknown as {
      propertyId: string;
      from?: string;
      to?: string;
      status?: string;
    };
    const reservations = await reservationsService.list(propertyId, { from, to, status });
    res.json({ reservations });
  })
);

router.get(
  "/:reservationId",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const reservation = await reservationsService.get(req.params.reservationId);
    res.json({ reservation });
  })
);

router.post(
  "/:reservationId/checkin",
  authenticate,
  authorize("FRONT_DESK", "MANAGER"),
  asyncHandler(async (req: Request, res: Response) => {
    const reservation = await reservationsService.checkIn(req.params.reservationId, req.user!.sub);
    res.json({ reservation });
  })
);

router.post(
  "/:reservationId/checkout",
  authenticate,
  authorize("FRONT_DESK", "MANAGER"),
  asyncHandler(async (req: Request, res: Response) => {
    const reservation = await reservationsService.checkOut(req.params.reservationId, req.user!.sub);
    res.json({ reservation });
  })
);

router.patch(
  "/:reservationId/status",
  authenticate,
  authorize("FRONT_DESK", "MANAGER"),
  validate(updateReservationStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const reservation = await reservationsService.cancel(req.params.reservationId, req.user!.sub, req.body.status);
    res.json({ reservation });
  })
);

export default router;
