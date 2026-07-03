import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

export type StaffRole = "OWNER" | "MANAGER" | "FRONT_DESK" | "HOUSEKEEPING" | "ACCOUNTANT";

/**
 * Restricts an endpoint to the given roles. Must run after `authenticate`.
 * OWNER is implicitly allowed everywhere a MANAGER is allowed, since an
 * Owner has cross-property, full-privilege access by design.
 */
export function authorize(...allowedRoles: StaffRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    const role = req.user.role as StaffRole;
    if (role === "OWNER" || allowedRoles.includes(role)) {
      return next();
    }
    return next(AppError.forbidden(`Role '${role}' is not permitted to perform this action`));
  };
}

/**
 * Ensures the authenticated staff member is scoped to the property referenced
 * by req.params.propertyId (Owners bypass this check, since they may act
 * across all properties on their account).
 */
export function scopeToOwnProperty(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(AppError.unauthorized());
  if (req.user.role === "OWNER") return next();

  const requestedPropertyId = req.params.propertyId;
  if (requestedPropertyId && req.user.propertyId !== requestedPropertyId) {
    return next(AppError.forbidden("You do not have access to this property"));
  }
  next();
}
