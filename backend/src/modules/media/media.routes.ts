import { Router, Request, Response } from "express";
import { mediaService } from "./media.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { requestUploadSchema, confirmUploadSchema, listMediaQuerySchema } from "./media.schemas";
import { AppError } from "../../utils/AppError";

const router = Router();

router.post(
  "/uploads",
  authenticate,
  validate(requestUploadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await mediaService.requestUpload(req.body, {
      staffId: req.user!.sub,
      staffPropertyId: req.user!.propertyId
    });
    res.status(201).json(result);
  })
);

router.post(
  "/uploads/confirm",
  authenticate,
  validate(confirmUploadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const media = await mediaService.confirmUpload(req.body.mediaId, { staffId: req.user!.sub });
    res.json({ media });
  })
);

router.get(
  "/",
  authenticate,
  validate(listMediaQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType, entityId } = req.query as unknown as { entityType: string; entityId: string };
    const items = await mediaService.listForEntity(entityType, entityId, {
      staffPropertyId: req.user!.propertyId,
      isOwner: req.user!.role === "OWNER"
    });
    res.json({ media: items });
  })
);

router.delete(
  "/:mediaId",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!["OWNER", "MANAGER"].includes(req.user!.role)) throw AppError.forbidden();
    await mediaService.remove(req.params.mediaId, {
      staffPropertyId: req.user!.propertyId,
      isOwner: req.user!.role === "OWNER",
      staffId: req.user!.sub
    });
    res.status(204).send();
  })
);

export default router;