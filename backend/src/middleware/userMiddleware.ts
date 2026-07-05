import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";

export const userMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  if (req.user.role !== "USER") {
    return res.status(403).json({ message: "User access is required" });
  }

  return next();
};
