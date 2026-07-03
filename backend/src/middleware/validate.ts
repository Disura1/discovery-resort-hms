import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/AppError";

type Part = "body" | "query" | "params";

export function validate(schema: ZodSchema, part: Part = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(AppError.badRequest("Validation failed", result.error.flatten()));
    }
    (req as any)[part] = result.data;
    next();
  };
}
