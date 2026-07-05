import { getPrisma } from "../config/prisma.js";

type CreateTicketInput = {
  userId: string;
  title: string;
  description: string;
};

const ticketSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  userId: true,
  createdAt: true,
  updatedAt: true
};

export const createTicket = async (input: CreateTicketInput) => {
  const prisma = getPrisma();

  return prisma.ticket.create({
    data: {
      title: input.title,
      description: input.description,
      userId: input.userId
    },
    select: ticketSelect
  });
};

export const listUserTickets = async (userId: string) => {
  const prisma = getPrisma();

  return prisma.ticket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: ticketSelect
  });
};

export const getUserTicketById = async (userId: string, ticketId: string) => {
  const prisma = getPrisma();

  return prisma.ticket.findFirst({
    where: {
      id: ticketId,
      userId
    },
    select: ticketSelect
  });
};
