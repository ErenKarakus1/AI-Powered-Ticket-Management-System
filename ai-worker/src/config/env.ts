import dotenv from "dotenv";

dotenv.config();

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  rabbitMqUrl: process.env.RABBITMQ_URL || "amqp://localhost:5672",
  ticketAnalysisQueue: process.env.TICKET_ANALYSIS_QUEUE || "ticket.analysis",
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || "gpt-5.4-nano"
};
