import { Router, Request, Response } from "express";
import { roomsRepository } from "./rooms.repository";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { AppError } from "../../utils/AppError";
import { recordAudit } from "../audit/audit.service";
import {
  createRoomTypeSchema,
  createRoomSchema,
  updateRoomStatusSchema,
  createRatePlanSchema
} from "./rooms.schemas";
import { z } from "zod";

const router = Router();

// ---- Public availability search (used by the guest booking widget) ----
const availabilityQuerySchema = z.object({
  propertyId: z.string().uuid(),
  checkIn: z.string(),
  checkOut: z.string()
});

router.get(
  "/availability",
  validate(availabilityQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { propertyId, checkIn, checkOut } = req.query as unknown as {
      propertyId: string;
      checkIn: string;
      checkOut: string;
    };
    if (new Date(checkOut) <= new Date(checkIn)) {
      throw AppError.badRequest("checkOut must be after checkIn");
    }
    const rooms = await roomsRepository.findAvailableRooms(propertyId, checkIn, checkOut);
    res.json({ rooms });
  })
);

// ---- Room types ----
router.get(
  "/properties/:propertyId/room-types",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const roomTypes = await roomsRepository.listRoomTypes(req.params.propertyId);
    res.json({ roomTypes });
  })
);

router.post(
  "/properties/:propertyId/room-types",
  authenticate,
  authorize("MANAGER"),
  validate(createRoomTypeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const roomType = await roomsRepository.createRoomType(req.params.propertyId, req.body);
    await recordAudit({
      staffId: req.user!.sub,
      propertyId: req.params.propertyId,
      action: "room_type.create",
      entityType: "room_type",
      entityId: roomType.id
    });
    res.status(201).json({ roomType });
  })
);

// ---- Rooms ----
router.get(
  "/properties/:propertyId/rooms",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const rooms = await roomsRepository.listRoomsByProperty(req.params.propertyId);
    res.json({ rooms });
  })
);

router.post(
  "/rooms",
  authenticate,
  authorize("MANAGER"),
  validate(createRoomSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const roomType = await roomsRepository.findRoomTypeById(req.body.roomTypeId);
    if (!roomType) throw AppError.notFound("Room type not found");
    const room = await roomsRepository.createRoom(req.body);
    await recordAudit({
      staffId: req.user!.sub,
      propertyId: roomType.property_id,
      action: "room.create",
      entityType: "room",
      entityId: room.id
    });
    res.status(201).json({ room });
  })
);

router.patch(
  "/rooms/:roomId/status",
  authenticate,
  authorize("HOUSEKEEPING", "FRONT_DESK", "MANAGER"),
  validate(updateRoomStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await roomsRepository.findRoomById(req.params.roomId);
    if (!existing) throw AppError.notFound("Room not found");
    const room = await roomsRepository.updateRoomStatus(req.params.roomId, req.body.status);
    await recordAudit({
      staffId: req.user!.sub,
      propertyId: existing.property_id,
      action: "room.status_update",
      entityType: "room",
      entityId: req.params.roomId,
      metadata: { from: existing.status, to: req.body.status }
    });
    res.json({ room });
  })
);

// ---- Rate plans ----
router.get(
  "/room-types/:roomTypeId/rate-plans",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const ratePlans = await roomsRepository.listRatePlansByRoomType(req.params.roomTypeId);
    res.json({ ratePlans });
  })
);

router.post(
  "/rate-plans",
  authenticate,
  authorize("MANAGER"),
  validate(createRatePlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const roomType = await roomsRepository.findRoomTypeById(req.body.roomTypeId);
    if (!roomType) throw AppError.notFound("Room type not found");
    const ratePlan = await roomsRepository.createRatePlan(req.body);
    await recordAudit({
      staffId: req.user!.sub,
      propertyId: roomType.property_id,
      action: "rate_plan.create",
      entityType: "rate_plan",
      entityId: ratePlan.id
    });
    res.status(201).json({ ratePlan });
  })
);

export default router;
