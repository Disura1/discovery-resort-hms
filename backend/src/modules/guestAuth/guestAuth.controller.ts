import { Request, Response } from "express";
import { guestAuthService } from "./guestAuth.service";
import { asyncHandler } from "../../utils/asyncHandler";

const REFRESH_COOKIE = "hms_guest_refresh_token";
const isProd = process.env.NODE_ENV === "production";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/api/guest-auth",
    maxAge: 90 * 24 * 60 * 60 * 1000
  });
}

export const guestAuthController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { fullName, email, password } = req.body;
    const result = await guestAuthService.register(fullName, email, password);
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json({ accessToken: result.accessToken, guest: result.guest });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await guestAuthService.login(email, password);
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken, guest: result.guest });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body.refreshToken;
    const result = await guestAuthService.refresh(token);
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body.refreshToken;
    if (token) await guestAuthService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: "/api/guest-auth" });
    res.status(204).send();
  })
};