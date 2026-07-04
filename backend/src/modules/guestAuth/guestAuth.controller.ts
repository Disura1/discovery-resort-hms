import { Request, Response } from "express";
import { guestAuthService } from "./guestAuth.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

const REFRESH_COOKIE = "hms_guest_refresh_token";
const isProd = process.env.NODE_ENV === "production";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/api/guest-auth",
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

export const guestAuthController = {
  requestOtp: asyncHandler(async (req: Request, res: Response) => {
    const email = req.body.email;

    if (!email) {
      throw AppError.badRequest("Email is required.");
    }

    await guestAuthService.requestOtp(email);

    res.json({
      message: "OTP sent successfully."
    });
  }),

  verifyOtp: asyncHandler(async (req: Request, res: Response) => {
    const email = req.body.email;

    // frontend එක otp / code / token කියන නමෙන් යැවුවත් support කරයි
    const otp = req.body.otp ?? req.body.code ?? req.body.token;
    const fullName = req.body.fullName ?? req.body.name;

    if (!email) {
      throw AppError.badRequest("Email is required.");
    }

    if (!otp) {
      throw AppError.badRequest("OTP code is required.");
    }

    const result = await guestAuthService.verifyOtp(email, otp, fullName);

    setRefreshCookie(res, result.refreshToken);

    res.json({
      accessToken: result.accessToken,
      guest: result.guest
    });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;

    const result = await guestAuthService.refresh(token);

    setRefreshCookie(res, result.refreshToken);

    res.json({
      accessToken: result.accessToken
    });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;

    await guestAuthService.logout(token);

    res.clearCookie(REFRESH_COOKIE, {
      path: "/api/guest-auth",
      httpOnly: true,
      secure: isProd,
      sameSite: "strict"
    });

    res.status(204).send();
  })
};