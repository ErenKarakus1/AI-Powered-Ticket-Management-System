import { createClient } from "redis";
import { env } from "./env.js";

const createRedisClient = () => {
  return createClient({
    url: env.redisUrl
  });
};

type RedisClient = ReturnType<typeof createRedisClient>;

let redisClient: RedisClient | null = null;
let redisConnectionPromise: Promise<RedisClient> | null = null;

export const getRedisClient = async () => {
  if (!redisClient) {
    const client = createRedisClient();

    client.on("error", (error) => {
      console.error("Redis client error", error);
    });

    redisClient = client;
  }

  if (!redisClient.isOpen) {
    const client = redisClient;
    redisConnectionPromise ||= client.connect().then(() => client);
    await redisConnectionPromise;
  }

  return redisClient;
};

export const closeRedisClient = async () => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }

  redisClient = null;
  redisConnectionPromise = null;
};
