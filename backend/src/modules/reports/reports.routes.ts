import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../../config/db";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";

const rangeQuerySchema = z.object({
  propertyId: z.string().uuid(),
  from: z.string(),
  to: z.string()
});

const router = Router();

router.get(
  "/occupancy",
  authenticate,
  authorize("MANAGER", "ACCOUNTANT"),
  validate(rangeQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { propertyId, from, to } = req.query as unknown as { propertyId: string; from: string; to: string };

    const { rows: totalRoomsRows } = await pool.query(
      `SELECT COUNT(*)::int AS total_rooms FROM rooms r
       JOIN room_types rt ON rt.id = r.room_type_id
       WHERE rt.property_id = $1 AND r.is_active = true`,
      [propertyId]
    );
    const totalRooms = totalRoomsRows[0]?.total_rooms ?? 0;

    const { rows } = await pool.query(
      `SELECT d::date AS date,
              COUNT(res.id) FILTER (WHERE res.status IN ('CONFIRMED','CHECKED_IN','CHECKED_OUT'))::int AS occupied_rooms
       FROM generate_series($2::date, $3::date, '1 day') AS d
       LEFT JOIN reservations res
         ON res.property_id = $1
        AND res.stay_range @> d::timestamptz
       GROUP BY d
       ORDER BY d`,
      [propertyId, from, to]
    );

    const occupancy = rows.map((r) => ({
      date: r.date,
      occupiedRooms: r.occupied_rooms,
      totalRooms,
      occupancyRate: totalRooms > 0 ? Number(((r.occupied_rooms / totalRooms) * 100).toFixed(1)) : 0
    }));

    res.json({ propertyId, from, to, totalRooms, occupancy });
  })
);

router.get(
  "/revenue",
  authenticate,
  authorize("MANAGER", "ACCOUNTANT"),
  validate(rangeQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { propertyId, from, to } = req.query as unknown as { propertyId: string; from: string; to: string };

    const { rows } = await pool.query(
      `SELECT date_trunc('day', p.created_at)::date AS date, SUM(p.amount)::numeric(12,2) AS revenue
       FROM payments p
       JOIN folios f ON f.id = p.folio_id
       JOIN reservations res ON res.id = f.reservation_id
       WHERE res.property_id = $1
         AND p.status = 'SUCCEEDED'
         AND p.created_at >= $2::date AND p.created_at < ($3::date + INTERVAL '1 day')
       GROUP BY 1 ORDER BY 1`,
      [propertyId, from, to]
    );

    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.revenue), 0);
    res.json({ propertyId, from, to, dailyRevenue: rows, totalRevenue: Number(totalRevenue.toFixed(2)) });
  })
);

router.get(
  "/adr-revpar",
  authenticate,
  authorize("MANAGER", "ACCOUNTANT"),
  validate(rangeQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { propertyId, from, to } = req.query as unknown as { propertyId: string; from: string; to: string };

    const { rows: totalRoomsRows } = await pool.query(
      `SELECT COUNT(*)::int AS total_rooms FROM rooms r
       JOIN room_types rt ON rt.id = r.room_type_id
       WHERE rt.property_id = $1 AND r.is_active = true`,
      [propertyId]
    );
    const totalRooms = totalRoomsRows[0]?.total_rooms ?? 0;

    const { rows: nightsRows } = await pool.query(
      `SELECT COALESCE(SUM(fli.amount), 0)::numeric(12,2) AS room_revenue,
              COUNT(*)::int AS room_nights_sold
       FROM folio_line_items fli
       JOIN folios f ON f.id = fli.folio_id
       JOIN reservations res ON res.id = f.reservation_id
       WHERE res.property_id = $1
         AND fli.description LIKE 'Room charge%'
         AND fli.posted_at >= $2::date AND fli.posted_at < ($3::date + INTERVAL '1 day')`,
      [propertyId, from, to]
    );

    const roomRevenue = Number(nightsRows[0]?.room_revenue ?? 0);
    const roomNightsSold = Number(nightsRows[0]?.room_nights_sold ?? 0);
    const daysInRange = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1);
    const availableRoomNights = totalRooms * daysInRange;

    const adr = roomNightsSold > 0 ? roomRevenue / roomNightsSold : 0;
    const revPar = availableRoomNights > 0 ? roomRevenue / availableRoomNights : 0;

    res.json({
      propertyId,
      from,
      to,
      roomRevenue: Number(roomRevenue.toFixed(2)),
      roomNightsSold,
      availableRoomNights,
      adr: Number(adr.toFixed(2)),
      revPar: Number(revPar.toFixed(2))
    });
  })
);

export default router;
