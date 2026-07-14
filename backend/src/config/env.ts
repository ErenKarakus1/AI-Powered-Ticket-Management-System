import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  rabbitMqUrl: process.env.RABBITMQ_URL,
  ticketAnalysisQueue: process.env.TICKET_ANALYSIS_QUEUE || "ticket.analysis",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  rateLimitStore: process.env.RATE_LIMIT_STORE || "memory"
};
