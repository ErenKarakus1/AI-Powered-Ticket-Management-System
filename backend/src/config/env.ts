import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  rabbitMqUrl: process.env.RABBITMQ_URL,
  ticketAnalysisQueue: process.env.TICKET_ANALYSIS_QUEUE || "ticket.analysis"
};
