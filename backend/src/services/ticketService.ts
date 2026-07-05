import { getPrisma } from "../config/prisma.js";

type CreateTicketInput = {
  userId: string;
  title: string;
  description: string;
};

type TicketStatusValue = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

type UpdateTicketStatusInput = {
  ticketId: string;
  status: TicketStatusValue;
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

const adminTicketSelect = {
  ...ticketSelect,
  user: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  analysis: true
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

export const listAllTickets = async () => {
  const prisma = getPrisma();

  return prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    select: adminTicketSelect
  });
};

export const getTicketById = async (ticketId: string) => {
  const prisma = getPrisma();

  return prisma.ticket.findUnique({
    where: { id: ticketId },
    select: adminTicketSelect
  });
};

export const updateTicketStatus = async (input: UpdateTicketStatusInput) => {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findUnique({
    where: { id: input.ticketId },
    select: { id: true }
  });

  if (!ticket) {
    return null;
  }

  return prisma.ticket.update({
    where: { id: input.ticketId },
    data: { status: input.status },
    select: adminTicketSelect
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
