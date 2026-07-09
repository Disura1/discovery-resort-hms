import { Router, Request, Response } from "express";
import { z } from "zod";

import { authenticateGuest } from "../../middleware/authenticateGuest";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

import { guestsRepository } from "../guests/guests.repository";
import { reservationsRepository } from "../reservations/reservations.repository";
import { reservationsService } from "../reservations/reservations.service";
import { foliosRepository } from "../folios/folios.repository";
import { propertiesRepository } from "../properties/properties.repository";
import { streamInvoicePdf } from "../folios/invoice";
import { feedbackRepository } from "../feedback/feedback.repository";

import { mediaService } from "../media/media.service";
import { requestUploadSchema, confirmUploadSchema } from "../media/media.schemas";

const router = Router();

// Every route in this file requires a guest session.
router.use(authenticateGuest);

async function assertOwnsReservation(reservationId: string, guestId: string) {
  const reservation = await reservationsRepository.findById(reservationId);

  if (!reservation) throw AppError.notFound("Reservation not found");

  if (reservation.guest_id !== guestId) {
    throw AppError.notFound("Reservation not found");
  }

  return reservation;
}

router.get(
  "/me",
  asyncHandler(async (req: Request, res: Response) => {
    const guest = await guestsRepository.findById(req.guest!.sub);

    if (!guest) throw AppError.notFound("Guest not found");

    res.json({
      guest: {
        id: guest.id,
        fullName: guest.full_name,
        email: guest.email,
        phone: guest.phone
      }
    });
  })
);

const createBookingSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid(),
  ratePlanId: z.string().uuid().optional(),
  checkIn: z.string(),
  checkOut: z.string()
});

router.post(
  "/bookings",
  validate(createBookingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await reservationsService.create(
      {
        ...req.body,
        guestId: req.guest!.sub
      },
      null
    );

    res.status(201).json(result);
  })
);

router.get(
  "/bookings",
  asyncHandler(async (req: Request, res: Response) => {
    const bookings = await reservationsRepository.listByGuest(req.guest!.sub);
    res.json({ bookings });
  })
);

router.get(
  "/bookings/:reservationId",
  asyncHandler(async (req: Request, res: Response) => {
    const reservation = await assertOwnsReservation(req.params.reservationId, req.guest!.sub);
    const folio = await foliosRepository.findByReservationId(reservation.id);

    const [lineItems, payments] = folio
      ? await Promise.all([
          foliosRepository.listLineItems(folio.id),
          foliosRepository.listPayments(folio.id)
        ])
      : [[], []];

    res.json({ reservation, folio, lineItems, payments });
  })
);

router.post(
  "/bookings/:reservationId/cancel",
  asyncHandler(async (req: Request, res: Response) => {
    await assertOwnsReservation(req.params.reservationId, req.guest!.sub);

    const reservation = await reservationsService.cancel(
      req.params.reservationId,
      null,
      "CANCELLED"
    );

    res.json({ reservation });
  })
);

router.get(
  "/bookings/:reservationId/invoice",
  asyncHandler(async (req: Request, res: Response) => {
    const reservation = await assertOwnsReservation(req.params.reservationId, req.guest!.sub);
    const folio = await foliosRepository.findByReservationId(reservation.id);

    if (!folio) throw AppError.notFound("No folio found for this reservation yet");

    const [lineItems, payments, property] = await Promise.all([
      foliosRepository.listLineItems(folio.id),
      foliosRepository.listPayments(folio.id),
      propertiesRepository.findById(reservation.property_id)
    ]);

    if (!property) throw AppError.notFound("Property not found");

    streamInvoicePdf(res, {
      property: {
        name: property.name,
        address: property.address,
        currency: property.currency
      },
      reservation: {
        id: reservation.id,
        check_in: reservation.check_in,
        check_out: reservation.check_out,
        room_number: reservation.room_number,
        room_type_name: reservation.room_type_name,
        guest_name: reservation.guest_name,
        guest_email: reservation.guest_email
      },
      folio,
      lineItems,
      payments
    });
  })
);

const feedbackSchema = z.object({
  reservationId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional()
});

router.post(
  "/feedback",
  validate(feedbackSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { reservationId, rating, comment } = req.body;
    let { propertyId } = req.body;

    if (reservationId) {
      const owns = await feedbackRepository.belongsToGuest(reservationId, req.guest!.sub);

      if (!owns) throw AppError.notFound("Reservation not found");

      if (!propertyId) {
        const reservation = await reservationsRepository.findById(reservationId);
        propertyId = reservation?.property_id ?? null;
      }
    }

    const feedback = await feedbackRepository.create({
      guestId: req.guest!.sub,
      reservationId: reservationId ?? null,
      propertyId: propertyId ?? null,
      rating,
      comment: comment ?? null
    });

    res.status(201).json({ feedback });
  })
);

/**
 * Guest media upload request.
 * Final URL:
 * POST /api/guest/media/uploads
 */
router.post(
  "/media/uploads",
  validate(requestUploadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (req.body.entityType === "RESERVATION") {
      await assertOwnsReservation(req.body.entityId, req.guest!.sub);
    }

    const result = await mediaService.requestUpload(req.body, {
      guestId: req.guest!.sub
    });

    res.status(201).json(result);
  })
);

/**
 * Guest media upload confirm.
 * Final URL:
 * POST /api/guest/media/uploads/confirm
 */
router.post(
  "/media/uploads/confirm",
  validate(confirmUploadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const media = await mediaService.confirmUpload(req.body.mediaId, {
      guestId: req.guest!.sub
    });

    res.json({ media });
  })
);

export default router;