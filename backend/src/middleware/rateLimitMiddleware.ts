import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";

type RateLimitKeyType = "ip" | "user";

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  keyType: RateLimitKeyType;
  message: string;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const getClientIp = (req: Request) => {
  return req.ip || req.socket.remoteAddress || "unknown";
};

const getRateLimitKey = (req: Request, keyType: RateLimitKeyType) => {
  if (keyType === "user") {
    const userId = (req as AuthenticatedRequest).user?.userId;

    return userId ? `user:${userId}` : `ip:${getClientIp(req)}`;
  }

  return `ip:${getClientIp(req)}`;
};

export const createRateLimit = (options: RateLimitOptions) => {
  const records = new Map<string, RateLimitRecord>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = getRateLimitKey(req, options.keyType);
    const currentRecord = records.get(key);

    if (!currentRecord || currentRecord.resetAt <= now) {
      records.set(key, {
        count: 1,
        resetAt: now + options.windowMs
      });

      return next();
    }

    if (currentRecord.count >= options.maxRequests) {
      const retryAfterSeconds = Math.ceil((currentRecord.resetAt - now) / 1000);

      res.setHeader("Retry-After", retryAfterSeconds.toString());
      return res.status(429).json({ message: options.message });
    }

    currentRecord.count += 1;
    records.set(key, currentRecord);

    return next();
  };
};

export const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyType: "ip",
  message: "Too many login attempts. Please try again later."
});

export const registerRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  keyType: "ip",
  message: "Too many registration attempts. Please try again later."
});

export const createTicketRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  keyType: "user",
  message: "Too many ticket creation attempts. Please try again later."
});

export const ticketMessageRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  keyType: "user",
  message: "Too many message attempts. Please try again later."
});
