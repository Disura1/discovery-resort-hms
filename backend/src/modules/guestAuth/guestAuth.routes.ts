import { Router } from "express";
import { guestAuthController } from "./guestAuth.controller";
import { validate } from "../../middleware/validate";
import { authRateLimiter } from "../../middleware/rateLimiter";
import { requestOtpSchema, verifyOtpSchema, guestRefreshSchema } from "./guestAuth.schemas";

const router = Router();

router.post("/request-otp", authRateLimiter, validate(requestOtpSchema), guestAuthController.requestOtp);
router.post("/verify-otp", authRateLimiter, validate(verifyOtpSchema), guestAuthController.verifyOtp);
router.post("/refresh", authRateLimiter, validate(guestRefreshSchema), guestAuthController.refresh);
router.post("/logout", guestAuthController.logout);

export default router;
