import { Request, Response, NextFunction } from "express";
import { verifyGuestAccessToken, type GuestAccessTokenPayload } from "../utils/guestJwt";
import { AppError } from "../utils/AppError";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      guest?: GuestAccessTokenPayload;
    }
  }
}

/**
 * Verifies a guest session token. Deliberately separate from `authenticate`
 * (staff): the two token types are signed with different secrets, so a
 * guest token can never be replayed against a staff-only endpoint or vice
 * versa, even if the JWT structure looks superficially similar.
 */
export function authenticateGuest(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(AppError.unauthorized("Missing or malformed Authorization header"));
  }
  const token = header.slice("Bearer ".length);
  try {
    req.guest = verifyGuestAccessToken(token);
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired session. Please log in again."));
  }
}
