import { Router, Request, Response } from "express";
import { pool } from "../../config/db";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.get(
  "/properties/:propertyId/board",
  authenticate,
  authorize("HOUSEKEEPING", "FRONT_DESK", "MANAGER"),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query(
      `SELECT r.id AS room_id, r.room_number, r.status, rt.name AS room_type_name
       FROM rooms r
       JOIN room_types rt ON rt.id = r.room_type_id
       WHERE rt.property_id = $1 AND r.is_active = true
       ORDER BY rt.name, r.room_number`,
      [req.params.propertyId]
    );
    res.json({ rooms: rows });
  })
);

export default router;
