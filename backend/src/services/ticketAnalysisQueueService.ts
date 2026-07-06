import amqp from "amqplib";
import type { Channel, ChannelModel } from "amqplib";
import { env } from "../config/env.js";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const getChannel = async () => {
  if (!env.rabbitMqUrl) {
    return null;
  }

  if (channel) {
    return channel;
  }

  connection = await amqp.connect(env.rabbitMqUrl);
  channel = await connection.createChannel();
  await channel.assertQueue(env.ticketAnalysisQueue, { durable: true });

  return channel;
};

export const publishTicketAnalysisJob = async (ticketId: string) => {
  const queueChannel = await getChannel();

  if (!queueChannel) {
    return false;
  }

  const payload = Buffer.from(JSON.stringify({ ticketId }));

  return queueChannel.sendToQueue(env.ticketAnalysisQueue, payload, {
    contentType: "application/json",
    persistent: true
  });
};

export const closeTicketAnalysisQueue = async () => {
  await channel?.close();
  await connection?.close();
  channel = null;
  connection = null;
};
