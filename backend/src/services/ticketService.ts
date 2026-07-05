import { getPrisma } from "../config/prisma.js";

type CreateTicketInput = {
  userId: string;
  title: string;
  description: string;
};

type TicketStatusValue = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketPriorityValue = "UNASSIGNED" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type UpdateTicketStatusInput = {
  ticketId: string;
  status: TicketStatusValue;
};

type UpdateTicketPriorityInput = {
  ticketId: string;
  priority: TicketPriorityValue;
};

type PaginationInput = {
  limit: number;
  offset: number;
};

type AdminTicketFilters = {
  status?: TicketStatusValue;
  priority?: TicketPriorityValue;
  search?: string;
};

type UserTicketFilters = {
  status?: TicketStatusValue;
  priority?: TicketPriorityValue;
  search?: string;
};

const latestMessageSelect = {
  orderBy: { createdAt: "desc" as const },
  take: 1,
  select: {
    createdAt: true,
    sender: {
      select: {
        role: true
      }
    }
  }
};

const ticketSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  messages: latestMessageSelect
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

export const listAllTickets = async (
  pagination: PaginationInput,
  filters: AdminTicketFilters = {}
) => {
  const prisma = getPrisma();
  const searchWhere = filters.search
    ? {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" as const } },
          { description: { contains: filters.search, mode: "insensitive" as const } }
        ]
      }
    : {};

  const tickets = await prisma.ticket.findMany({
    where: {
      status: filters.status,
      priority: filters.priority,
      ...searchWhere
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: pagination.offset,
    take: pagination.limit + 1,
    select: adminTicketSelect
  });

  return {
    tickets: tickets.slice(0, pagination.limit),
    hasMore: tickets.length > pagination.limit
  };
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

export const updateTicketPriority = async (input: UpdateTicketPriorityInput) => {
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
    data: { priority: input.priority },
    select: adminTicketSelect
  });
};

export const listUserTickets = async (
  userId: string,
  pagination: PaginationInput,
  filters: UserTicketFilters = {}
) => {
  const prisma = getPrisma();
  const searchWhere = filters.search
    ? {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" as const } },
          { description: { contains: filters.search, mode: "insensitive" as const } }
        ]
      }
    : {};
  const where = {
    userId,
    status: filters.status,
    priority: filters.priority,
    ...searchWhere
  };

  const [tickets, totalCount] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: pagination.offset,
      take: pagination.limit + 1,
      select: {
        ...ticketSelect,
        reads: {
          where: { userId },
          take: 1,
          select: {
            lastReadAt: true
          }
        }
      }
    }),
    prisma.ticket.count({ where })
  ]);

  const normalizedTickets = tickets.slice(0, pagination.limit).map(({ reads, ...ticket }) => {
    const latestMessage = ticket.messages[0];
    const read = reads[0];
    const unread =
      latestMessage?.sender.role === "ADMIN" &&
      (!read || read.lastReadAt.getTime() < latestMessage.createdAt.getTime());

    return {
      ...ticket,
      unread
    };
  });

  return {
    tickets: normalizedTickets,
    hasMore: tickets.length > pagination.limit,
    totalCount
  };
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

export const markUserTicketAsRead = async (userId: string, ticketId: string) => {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      userId
    },
    select: {
      id: true,
      messages: latestMessageSelect
    }
  });

  if (!ticket) {
    return null;
  }

  const lastReadAt = ticket.messages[0]?.createdAt || new Date();

  return prisma.ticketRead.upsert({
    where: {
      ticketId_userId: {
        ticketId,
        userId
      }
    },
    update: {
      lastReadAt
    },
    create: {
      ticketId,
      userId,
      lastReadAt
    }
  });
};

export const getTicketStats = async () => {
  const prisma = getPrisma();

  const [
    totalTicketsCount,
    openTicketsCount,
    inProgressTicketsCount,
    resolvedTicketsCount,
    closedTicketsCount
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { status: "RESOLVED" } }),
    prisma.ticket.count({ where: { status: "CLOSED" } })
  ]);

  return {
    total: totalTicketsCount,
    open: openTicketsCount,
    inProgress: inProgressTicketsCount,
    resolved: resolvedTicketsCount,
    closed: closedTicketsCount
  };
};
