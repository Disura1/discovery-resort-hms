import { withTransaction } from "../../config/db";
import { reservationsRepository } from "./reservations.repository";
import { foliosRepository } from "../folios/folios.repository";
import { roomsRepository } from "../rooms/rooms.repository";
import { guestsRepository } from "../guests/guests.repository";
import { AppError } from "../../utils/AppError";
import { recordAudit } from "../audit/audit.service";

const EXCLUSION_VIOLATION = "23P01";

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export const reservationsService = {
  async create(
    input: {
      propertyId: string;
      roomId: string;
      ratePlanId?: string;
      checkIn: string;
      checkOut: string;
      guestId?: string;
      guest?: { fullName: string; email?: string; phone?: string };
    },
    createdBy: string | null
  ) {
    if (new Date(input.checkOut) <= new Date(input.checkIn)) {
      throw AppError.badRequest("checkOut must be after checkIn");
    }

    const room = await roomsRepository.findRoomById(input.roomId);
    if (!room) throw AppError.notFound("Room not found");
    if (room.property_id !== input.propertyId) {
      throw AppError.badRequest("Room does not belong to the specified property");
    }

    const roomType = await roomsRepository.findRoomTypeById(room.room_type_id);
    let nightlyRate = Number(roomType.base_rate);

    if (input.ratePlanId) {
      const ratePlan = await roomsRepository.findRatePlanById(input.ratePlanId);
      if (!ratePlan) throw AppError.notFound("Rate plan not found");
      nightlyRate = nightlyRate * Number(ratePlan.rate_multiplier);
    }

    try {
      return await withTransaction(async (client) => {
        let guestId = input.guestId;
        if (!guestId && input.guest) {
          const guest = await guestsRepository.create(input.guest);
          guestId = guest.id;
        }
        if (!guestId) throw AppError.badRequest("guestId or guest details are required");

        const reservation = await reservationsRepository.insert(client, {
          propertyId: input.propertyId,
          roomId: input.roomId,
          guestId,
          ratePlanId: input.ratePlanId ?? null,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          createdBy
        });

        const folio = await foliosRepository.create(client, reservation.id);

        const nights = nightsBetween(input.checkIn, input.checkOut);
        for (let i = 0; i < nights; i++) {
          await foliosRepository.addLineItem(client, {
            folioId: folio.id,
            description: `Room charge - ${roomType.name} - night ${i + 1}`,
            amount: Number(nightlyRate.toFixed(2)),
            postedBy: createdBy
          });
        }

        await recordAudit(
          {
            staffId: createdBy,
            propertyId: input.propertyId,
            action: "reservation.create",
            entityType: "reservation",
            entityId: reservation.id,
            metadata: { roomId: input.roomId, checkIn: input.checkIn, checkOut: input.checkOut }
          },
          client
        );

        return { reservation, folio };
      });
    } catch (err: any) {
      if (err?.code === EXCLUSION_VIOLATION) {
        throw AppError.conflict("This room is no longer available for the selected dates");
      }
      throw err;
    }
  },

  async get(id: string) {
    const reservation = await reservationsRepository.findById(id);
    if (!reservation) throw AppError.notFound("Reservation not found");
    return reservation;
  },

  async list(propertyId: string, filters: { from?: string; to?: string; status?: string }) {
    return reservationsRepository.listByProperty(propertyId, filters);
  },

  async checkIn(reservationId: string, staffId: string) {
    const reservation = await this.get(reservationId);
    if (reservation.status !== "CONFIRMED") {
      throw AppError.conflict(`Cannot check in a reservation with status ${reservation.status}`);
    }
    return withTransaction(async (client) => {
      const updated = await reservationsRepository.updateStatus(client, reservationId, "CHECKED_IN");
      await roomsRepository.updateRoomStatus(reservation.room_id, "OCCUPIED");
      await recordAudit(
        {
          staffId,
          propertyId: reservation.property_id,
          action: "reservation.checkin",
          entityType: "reservation",
          entityId: reservationId
        },
        client
      );
      return updated;
    });
  },

  async checkOut(reservationId: string, staffId: string) {
    const reservation = await this.get(reservationId);
    if (reservation.status !== "CHECKED_IN") {
      throw AppError.conflict(`Cannot check out a reservation with status ${reservation.status}`);
    }
    const folio = await foliosRepository.findByReservationId(reservationId);
    if (!folio) throw AppError.internal("Folio missing for reservation");
    if (Number(folio.balance) > 0) {
      throw AppError.conflict("Cannot check out while the folio has an outstanding balance", {
        balance: folio.balance
      });
    }

    return withTransaction(async (client) => {
      const updated = await reservationsRepository.updateStatus(client, reservationId, "CHECKED_OUT");
      await roomsRepository.updateRoomStatus(reservation.room_id, "DIRTY");
      await foliosRepository.closeFolio(client, folio.id);
      await recordAudit(
        {
          staffId,
          propertyId: reservation.property_id,
          action: "reservation.checkout",
          entityType: "reservation",
          entityId: reservationId
        },
        client
      );
      return updated;
    });
  },

  async cancel(reservationId: string, staffId: string | null, newStatus: "CANCELLED" | "NO_SHOW") {
    const reservation = await this.get(reservationId);
    if (!["PENDING", "CONFIRMED"].includes(reservation.status)) {
      throw AppError.conflict(`Cannot set status ${newStatus} for a reservation with status ${reservation.status}`);
    }
    return withTransaction(async (client) => {
      const updated = await reservationsRepository.updateStatus(client, reservationId, newStatus);
      await recordAudit(
        {
          staffId,
          propertyId: reservation.property_id,
          action: `reservation.${newStatus.toLowerCase()}`,
          entityType: "reservation",
          entityId: reservationId
        },
        client
      );
      return updated;
    });
  }
};
