import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";

export const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access is required" });
  }

  return next();
};
