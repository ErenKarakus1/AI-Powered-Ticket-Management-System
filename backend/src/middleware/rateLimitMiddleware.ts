import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { getRedisClient } from "../config/redis.js";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";

type RateLimitKeyType = "ip" | "user";

type RateLimitStore = {
  consume: (key: string, windowMs: number) => Promise<RateLimitResult>;
};

type RateLimitOptions = {
  scope: string;
  windowMs: number;
  maxRequests: number;
  keyType: RateLimitKeyType;
  message: string;
  store?: RateLimitStore;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  count: number;
  retryAfterSeconds: number;
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

const createMemoryRateLimitStore = (): RateLimitStore => {
  const records = new Map<string, RateLimitRecord>();

  return {
    async consume(key: string, windowMs: number) {
      const now = Date.now();
      const currentRecord = records.get(key);

      if (!currentRecord || currentRecord.resetAt <= now) {
        records.set(key, {
          count: 1,
          resetAt: now + windowMs
        });

        return {
          count: 1,
          retryAfterSeconds: Math.ceil(windowMs / 1000)
        };
      }

      currentRecord.count += 1;
      records.set(key, currentRecord);

      return {
        count: currentRecord.count,
        retryAfterSeconds: Math.ceil((currentRecord.resetAt - now) / 1000)
      };
    }
  };
};

const redisRateLimitStore: RateLimitStore = {
  async consume(key: string, windowMs: number) {
    const redis = await getRedisClient();
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.pExpire(key, windowMs);
    }

    let ttl = await redis.pTTL(key);

    if (ttl < 0) {
      await redis.pExpire(key, windowMs);
      ttl = windowMs;
    }

    return {
      count,
      retryAfterSeconds: Math.ceil(ttl / 1000)
    };
  }
};

const createRateLimitStore = () => {
  if (env.rateLimitStore === "redis") {
    return redisRateLimitStore;
  }

  return createMemoryRateLimitStore();
};

export const createRateLimit = (options: RateLimitOptions) => {
  const store = options.store || createRateLimitStore();

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identityKey = getRateLimitKey(req, options.keyType);
      const key = `rate-limit:${options.scope}:${identityKey}`;
      const result = await store.consume(key, options.windowMs);

      if (result.count > options.maxRequests) {
        res.setHeader("Retry-After", result.retryAfterSeconds.toString());
        return res.status(429).json({ message: options.message });
      }

      return next();
    } catch {
      return res.status(503).json({ message: "Rate limit service is unavailable" });
    }
  };
};

export const loginRateLimit = createRateLimit({
  scope: "auth:login",
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyType: "ip",
  message: "Too many login attempts. Please try again later."
});

export const registerRateLimit = createRateLimit({
  scope: "auth:register",
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  keyType: "ip",
  message: "Too many registration attempts. Please try again later."
});

export const createTicketRateLimit = createRateLimit({
  scope: "tickets:create",
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  keyType: "user",
  message: "Too many ticket creation attempts. Please try again later."
});

export const ticketMessageRateLimit = createRateLimit({
  scope: "tickets:messages:create",
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  keyType: "user",
  message: "Too many message attempts. Please try again later."
});
