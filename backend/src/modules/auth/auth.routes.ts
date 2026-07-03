import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { authRateLimiter } from "../../middleware/rateLimiter";
import { loginSchema, refreshSchema, createStaffSchema } from "./auth.schemas";

const router = Router();

router.post("/login", authRateLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authRateLimiter, validate(refreshSchema.partial()), authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);

// Staff account creation is restricted to Owner/Manager roles.
router.post(
  "/staff",
  authenticate,
  authorize("MANAGER"),
  validate(createStaffSchema),
  authController.createStaff
);

export default router;
