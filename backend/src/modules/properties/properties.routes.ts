import { Router, Request, Response } from "express";
import { propertiesRepository } from "./properties.repository";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { createPropertySchema, updatePropertySchema } from "./properties.schemas";
import { AppError } from "../../utils/AppError";
import { recordAudit } from "../audit/audit.service";

const router = Router();

// Public: lets the guest portal / booking widget list hotels to book at,
// without exposing anything beyond what a guest would see on a hotel's own
// website (no internal settings, no staff data).
router.get(
  "/public",
  asyncHandler(async (_req: Request, res: Response) => {
    const all = await propertiesRepository.findAll();
    res.json({
      properties: all.map((p) => ({ id: p.id, name: p.name, address: p.address, currency: p.currency }))
    });
  })
);

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const all = await propertiesRepository.findAll();
    // Non-owner staff only ever see their own assigned property.
    const visible = req.user!.role === "OWNER" ? all : all.filter((p) => p.id === req.user!.propertyId);
    res.json({ properties: visible });
  })
);

router.get(
  "/:propertyId",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const property = await propertiesRepository.findById(req.params.propertyId);
    if (!property) throw AppError.notFound("Property not found");
    res.json({ property });
  })
);

router.post(
  "/",
  authenticate,
  authorize("OWNER"),
  validate(createPropertySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const property = await propertiesRepository.create(req.body);
    await recordAudit({
      staffId: req.user!.sub,
      propertyId: property.id,
      action: "property.create",
      entityType: "property",
      entityId: property.id
    });
    res.status(201).json({ property });
  })
);

router.patch(
  "/:propertyId",
  authenticate,
  authorize("OWNER", "MANAGER"),
  validate(updatePropertySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const property = await propertiesRepository.update(req.params.propertyId, req.body);
    if (!property) throw AppError.notFound("Property not found");
    await recordAudit({
      staffId: req.user!.sub,
      propertyId: property.id,
      action: "property.update",
      entityType: "property",
      entityId: property.id,
      metadata: req.body
    });
    res.json({ property });
  })
);

export default router;
