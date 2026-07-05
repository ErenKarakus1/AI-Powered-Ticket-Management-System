import type { Request, Response } from "express";
import { checkDatabaseHealth, getHealthStatus } from "../services/healthService.js";

export const healthController = (_req: Request, res: Response) => {
  res.status(200).json(getHealthStatus());
};

export const databaseHealthController = async (_req: Request, res: Response) => {
  try {
    const result = await checkDatabaseHealth();
    res.status(200).json(result);
  } catch {
    res.status(503).json({
      status: "error",
      database: "disconnected"
    });
  }
};
