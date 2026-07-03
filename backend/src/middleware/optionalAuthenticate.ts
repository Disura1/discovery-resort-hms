import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      req.user = verifyAccessToken(header.slice("Bearer ".length));
    } catch {
      // Ignore invalid/expired tokens on this route — treat the caller as a guest.
    }
  }
  next();
}
