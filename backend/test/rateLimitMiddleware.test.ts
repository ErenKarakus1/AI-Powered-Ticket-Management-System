import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { createRateLimit } from "../src/middleware/rateLimitMiddleware.js";

const makeMockResponse = () => {
  const headers = new Map<string, string>();
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      headers.set(name, value);
      return this;
    },
    getHeader(name: string) {
      return headers.get(name);
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };

  return response;
};

describe("rate limit middleware", () => {
  it("blocks requests after the configured IP limit", () => {
    const limiter = createRateLimit({
      windowMs: 60_000,
      maxRequests: 2,
      keyType: "ip",
      message: "Too many requests"
    });
    const request = {
      ip: "127.0.0.1",
      socket: {}
    } as Request;
    const nextCalls: number[] = [];
    const next: NextFunction = () => {
      nextCalls.push(1);
    };

    limiter(request, makeMockResponse() as unknown as Response, next);
    limiter(request, makeMockResponse() as unknown as Response, next);

    const blockedResponse = makeMockResponse();
    limiter(request, blockedResponse as unknown as Response, next);

    assert.equal(nextCalls.length, 2);
    assert.equal(blockedResponse.statusCode, 429);
    assert.deepEqual(blockedResponse.body, { message: "Too many requests" });
    assert.ok(blockedResponse.getHeader("Retry-After"));
  });

  it("tracks authenticated users separately", () => {
    const limiter = createRateLimit({
      windowMs: 60_000,
      maxRequests: 1,
      keyType: "user",
      message: "Too many user requests"
    });
    const nextCalls: string[] = [];
    const nextFor = (userId: string): NextFunction => {
      return () => {
        nextCalls.push(userId);
      };
    };

    limiter(
      { user: { userId: "user-a", role: "USER" }, socket: {} } as unknown as Request,
      makeMockResponse() as unknown as Response,
      nextFor("user-a")
    );

    const blockedResponse = makeMockResponse();
    limiter(
      { user: { userId: "user-a", role: "USER" }, socket: {} } as unknown as Request,
      blockedResponse as unknown as Response,
      nextFor("user-a")
    );

    limiter(
      { user: { userId: "user-b", role: "USER" }, socket: {} } as unknown as Request,
      makeMockResponse() as unknown as Response,
      nextFor("user-b")
    );

    assert.deepEqual(nextCalls, ["user-a", "user-b"]);
    assert.equal(blockedResponse.statusCode, 429);
  });
});
