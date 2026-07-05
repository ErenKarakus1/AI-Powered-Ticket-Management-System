import { getPrisma } from "../config/prisma.js";

export const getHealthStatus = () => {
  return {
    status: "ok",
    service: "backend"
  };
};

export const checkDatabaseHealth = async () => {
  const prisma = getPrisma();

  await prisma.$queryRaw`SELECT 1`;

  return {
    status: "ok",
    database: "connected"
  };
};
