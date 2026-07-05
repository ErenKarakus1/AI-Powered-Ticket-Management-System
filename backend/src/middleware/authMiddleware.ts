import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthenticatedRequest, AuthenticatedUser } from "../types/authenticatedRequest.js";

const isAuthenticatedUser = (value: unknown): value is AuthenticatedUser => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return typeof payload.userId === "string" && typeof payload.role === "string";
};

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!env.jwtSecret) {
    return res.status(500).json({ message: "JWT_SECRET is required" });
  }

  const authorization = req.header("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  const token = authorization.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (!isAuthenticatedUser(payload)) {
      return res.status(401).json({ message: "Invalid authorization token" });
    }

    req.user = {
      userId: payload.userId,
      role: payload.role
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid authorization token" });
  }
};
