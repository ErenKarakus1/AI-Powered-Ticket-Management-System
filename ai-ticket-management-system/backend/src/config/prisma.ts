import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

let prisma: PrismaClient | null = null;

export const getPrisma = () => {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (!prisma) {
    const adapter = new PrismaPg({
      connectionString: env.databaseUrl
    });

    prisma = new PrismaClient({ adapter });
  }

  return prisma;
};
