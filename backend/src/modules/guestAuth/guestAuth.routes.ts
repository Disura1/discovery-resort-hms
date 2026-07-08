import { Router } from "express";
import { guestAuthController } from "./guestAuth.controller";
import { validate } from "../../middleware/validate";
import { authRateLimiter } from "../../middleware/rateLimiter";
import { registerGuestSchema, guestLoginSchema, guestRefreshSchema } from "./guestAuth.schemas";

const router = Router();

router.post("/register", authRateLimiter, validate(registerGuestSchema), guestAuthController.register);
router.post("/login", authRateLimiter, validate(guestLoginSchema), guestAuthController.login);
router.post("/refresh", authRateLimiter, validate(guestRefreshSchema), guestAuthController.refresh);
router.post("/logout", guestAuthController.logout);

export default router;