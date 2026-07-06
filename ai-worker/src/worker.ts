import amqp from "amqplib";
import type { ConsumeMessage } from "amqplib";
import { env } from "./config/env.js";
import { closeDatabase } from "./db.js";
import { analyzeTicketWithAi } from "./services/aiAnalysisService.js";
import { getTicketForAnalysis, saveTicketAnalysis } from "./services/ticketRepository.js";

type TicketAnalysisJob = {
  ticketId: string;
};

const maxAttempts = 3;

const parseJob = (message: ConsumeMessage) => {
  const parsed = JSON.parse(message.content.toString("utf8")) as {
    ticketId?: unknown;
  };

  if (typeof parsed.ticketId !== "string") {
    throw new Error("Ticket analysis job is missing ticketId");
  }

  return {
    ticketId: parsed.ticketId
  };
};

const handleJob = async (job: TicketAnalysisJob) => {
  const ticket = await getTicketForAnalysis(job.ticketId);

  if (!ticket) {
    console.warn(`Ticket ${job.ticketId} not found; skipping analysis`);
    return;
  }

  const analysis = await analyzeTicketWithAi({
    title: ticket.title,
    description: ticket.description
  });

  await saveTicketAnalysis({
    ticketId: ticket.id,
    ...analysis
  });

  console.log(`Analyzed ticket ${ticket.id} as ${analysis.category}/${analysis.priority}`);
};

const startWorker = async () => {
  const connection = await amqp.connect(env.rabbitMqUrl);
  const channel = await connection.createChannel();

  await channel.assertQueue(env.ticketAnalysisQueue, { durable: true });
  channel.prefetch(1);

  console.log(`AI worker listening on queue "${env.ticketAnalysisQueue}"`);

  await channel.consume(
    env.ticketAnalysisQueue,
    (message) => {
      if (!message) {
        return;
      }

      void (async () => {
        try {
          const job = parseJob(message);
          await handleJob(job);
          channel.ack(message);
        } catch (error) {
          const attempts = Number(message.properties.headers?.attempts || 0) + 1;
          console.error(`Ticket analysis job failed on attempt ${attempts}`, error);

          if (attempts < maxAttempts) {
            channel.sendToQueue(env.ticketAnalysisQueue, message.content, {
              contentType: "application/json",
              persistent: true,
              headers: {
                attempts
              }
            });
          }

          channel.ack(message);
        }
      })();
    },
    { noAck: false }
  );

  const shutdown = async () => {
    console.log("AI worker shutting down");
    await channel.close();
    await connection.close();
    await closeDatabase();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
};

startWorker().catch(async (error) => {
  console.error("AI worker failed to start", error);
  await closeDatabase();
  process.exit(1);
});
