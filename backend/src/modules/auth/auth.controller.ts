import { Request, Response } from "express";
import { authService } from "./auth.service";
import { asyncHandler } from "../../utils/asyncHandler";

const REFRESH_COOKIE = "hms_refresh_token";
const isProd = process.env.NODE_ENV === "production";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password, req.ip);
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken, staff: result.staff });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body.refreshToken;
    const result = await authService.refresh(token);
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body.refreshToken;
    if (token) await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.status(204).send();
  }),

  createStaff: asyncHandler(async (req: Request, res: Response) => {
    const actor = { staffId: req.user!.sub, propertyId: req.user!.propertyId };
    const staff = await authService.createStaff(req.body, actor);
    res.status(201).json({ staff });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    res.json({ user: req.user });
  })
};
