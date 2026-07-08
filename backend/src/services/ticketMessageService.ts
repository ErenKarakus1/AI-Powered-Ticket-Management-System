import { getPrisma } from "../config/prisma.js";

type CreateTicketMessageInput = {
  ticketId: string;
  senderId: string;
  body: string;
};

const messageSelect = {
  id: true,
  ticketId: true,
  senderId: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  sender: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  }
};

const ticketIdentitySelect = {
  id: true
};

export const userCanAccessTicket = async (userId: string, ticketId: string) => {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      userId
    },
    select: ticketIdentitySelect
  });

  return Boolean(ticket);
};

export const getUserTicketForMessaging = async (userId: string, ticketId: string) => {
  const prisma = getPrisma();

  return prisma.ticket.findFirst({
    where: {
      id: ticketId,
      userId
    },
    select: {
      id: true,
      status: true
    }
  });
};

export const adminCanAccessTicket = async (adminId: string, ticketId: string) => {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      OR: [{ assignedAdminId: null }, { assignedAdminId: adminId }]
    },
    select: ticketIdentitySelect
  });

  return Boolean(ticket);
};

export const listTicketMessages = async (ticketId: string) => {
  const prisma = getPrisma();

  return prisma.ticketMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    select: messageSelect
  });
};

export const createTicketMessage = async (input: CreateTicketMessageInput) => {
  const prisma = getPrisma();

  return prisma.ticketMessage.create({
    data: {
      ticketId: input.ticketId,
      senderId: input.senderId,
      body: input.body
    },
    select: messageSelect
  });
};
