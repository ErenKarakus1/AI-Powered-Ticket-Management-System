import { getPrisma } from "../config/prisma.js";

type CreateTicketInput = {
  userId: string;
  title: string;
  description: string;
};

type TicketStatusValue = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketPriorityValue = "UNASSIGNED" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type TicketAssignmentFilterValue = "ALL" | "UNASSIGNED" | "MINE";

type UpdateTicketStatusInput = {
  ticketId: string;
  status: TicketStatusValue;
  adminId: string;
};

type UpdateTicketPriorityInput = {
  ticketId: string;
  priority: TicketPriorityValue;
  adminId: string;
};

type UpdateTicketAssignmentInput = {
  ticketId: string;
  adminId: string | null;
  requestingAdminId: string;
};

type PaginationInput = {
  limit: number;
  offset: number;
};

type AdminTicketFilters = {
  status?: TicketStatusValue;
  priority?: TicketPriorityValue;
  search?: string;
  assignment?: TicketAssignmentFilterValue;
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

const adminPriorityOrder: TicketPriorityValue[] = ["URGENT", "HIGH", "MEDIUM", "LOW", "UNASSIGNED"];
const assignmentOrder = [null, "ASSIGNED"] as const;

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

const userTicketInternalSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  userId: true,
  assignedAdminId: true,
  assignedAt: true,
  createdAt: true,
  updatedAt: true
};

const adminTicketSelect = {
  ...ticketSelect,
  assignedAdminId: true,
  assignedAt: true,
  analysis: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  assignedAdmin: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
};

type UserTicketRecord = {
  id: string;
  title: string;
  description: string;
  status: TicketStatusValue;
  priority: TicketPriorityValue;
  userId: string;
  assignedAdminId: string | null;
  assignedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const attachUserTicketDetails = async (tickets: UserTicketRecord[], userId: string) => {
  const prisma = getPrisma();
  const ticketIds = tickets.map((ticket) => ticket.id);

  if (ticketIds.length === 0) {
    return [];
  }

  const assignedAdminIds = tickets
    .map((ticket) => ticket.assignedAdminId)
    .filter((adminId): adminId is string => Boolean(adminId));

  const [messages, reads, analyses, assignedAdmins] = await Promise.all([
    prisma.ticketMessage.findMany({
      where: { ticketId: { in: ticketIds } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        ticketId: true,
        createdAt: true,
        sender: {
          select: {
            role: true
          }
        }
      }
    }),
    prisma.ticketRead.findMany({
      where: {
        ticketId: { in: ticketIds },
        userId
      },
      select: {
        ticketId: true,
        lastReadAt: true
      }
    }),
    prisma.ticketAnalysis.findMany({
      where: { ticketId: { in: ticketIds } },
      select: {
        ticketId: true,
        category: true
      }
    }),
    assignedAdminIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: assignedAdminIds } },
          select: {
            id: true,
            name: true
          }
        })
      : Promise.resolve([])
  ]);

  const latestMessageByTicketId = new Map<string, (typeof messages)[number]>();
  for (const message of messages) {
    if (!latestMessageByTicketId.has(message.ticketId)) {
      latestMessageByTicketId.set(message.ticketId, message);
    }
  }

  const readByTicketId = new Map(reads.map((read) => [read.ticketId, read]));
  const analysisByTicketId = new Map(analyses.map((analysis) => [analysis.ticketId, analysis]));
  const assignedAdminById = new Map(assignedAdmins.map((admin) => [admin.id, admin]));

  return tickets.map(({ assignedAdminId, ...ticket }) => {
    const latestMessage = latestMessageByTicketId.get(ticket.id);
    const analysis = analysisByTicketId.get(ticket.id);

    return {
      ...ticket,
      analysis: analysis ? { category: analysis.category } : null,
      assignedAdmin: assignedAdminId ? assignedAdminById.get(assignedAdminId) || null : null,
      messages: latestMessage
        ? [
            {
              createdAt: latestMessage.createdAt,
              sender: latestMessage.sender
            }
          ]
        : [],
      read: readByTicketId.get(ticket.id) || null
    };
  });
};

export const createTicket = async (input: CreateTicketInput) => {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.create({
    data: {
      title: input.title,
      description: input.description,
      userId: input.userId
    },
    select: userTicketInternalSelect
  });

  const [createdTicket] = await attachUserTicketDetails([ticket], input.userId);
  const { read, ...userTicket } = createdTicket;

  return userTicket;
};

const getLatestUserNotificationAt = (ticket: {
  assignedAt: Date | null;
  messages: Array<{
    createdAt: Date;
    sender: {
      role: string;
    };
  }>;
}) => {
  const latestAdminMessageAt =
    ticket.messages[0]?.sender.role === "ADMIN" ? ticket.messages[0].createdAt : null;
  const notificationDates = [latestAdminMessageAt, ticket.assignedAt].filter(
    (date): date is Date => Boolean(date)
  );

  if (notificationDates.length === 0) {
    return null;
  }

  return notificationDates.reduce((latestDate, currentDate) =>
    currentDate.getTime() > latestDate.getTime() ? currentDate : latestDate
  );
};

export const listAllTickets = async (
  pagination: PaginationInput,
  filters: AdminTicketFilters = {},
  adminId?: string
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
  const assignmentWhere =
    filters.assignment === "UNASSIGNED"
      ? { assignedAdminId: null }
      : filters.assignment === "MINE" && adminId
        ? { assignedAdminId: adminId }
        : adminId
          ? {
              OR: [{ assignedAdminId: null }, { assignedAdminId: adminId }]
            }
          : { assignedAdminId: null };

  const statusOrder: TicketStatusValue[] = filters.status
    ? [filters.status]
    : ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  const priorityOrder = filters.priority ? [filters.priority] : adminPriorityOrder;
  const adminAssignmentOrder =
    filters.assignment === "UNASSIGNED"
      ? [null]
      : filters.assignment === "MINE"
        ? ["ASSIGNED"]
        : assignmentOrder;
  const orderedTickets = [];

  for (const status of statusOrder) {
    for (const priority of priorityOrder) {
      for (const assignmentState of adminAssignmentOrder) {
        const orderedAssignmentWhere =
          assignmentState === null
            ? { assignedAdminId: null }
            : adminId
              ? { assignedAdminId: adminId }
              : {};

      const tickets = await prisma.ticket.findMany({
        where: {
          status,
          priority,
          ...assignmentWhere,
          ...orderedAssignmentWhere,
          ...searchWhere
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: adminTicketSelect
      });

      orderedTickets.push(...tickets);
      }
    }
  }

  const tickets = orderedTickets.slice(pagination.offset, pagination.offset + pagination.limit + 1);

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

export const getAccessibleTicketById = async (ticketId: string, adminId: string) => {
  const prisma = getPrisma();

  return prisma.ticket.findFirst({
    where: {
      id: ticketId,
      OR: [{ assignedAdminId: null }, { assignedAdminId: adminId }]
    },
    select: adminTicketSelect
  });
};

export const updateTicketStatus = async (input: UpdateTicketStatusInput) => {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: input.ticketId,
      OR: [{ assignedAdminId: null }, { assignedAdminId: input.adminId }]
    },
    select: { id: true }
  });

  if (!ticket) {
    return null;
  }

  return prisma.ticket.update({
    where: { id: input.ticketId },
    data: { status: input.status },
    select: { id: true }
  }).then(() => {
    return getAccessibleTicketById(input.ticketId, input.adminId);
  });
};

export const updateTicketPriority = async (input: UpdateTicketPriorityInput) => {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: input.ticketId,
      OR: [{ assignedAdminId: null }, { assignedAdminId: input.adminId }]
    },
    select: { id: true }
  });

  if (!ticket) {
    return null;
  }

  return prisma.ticket.update({
    where: { id: input.ticketId },
    data: { priority: input.priority },
    select: { id: true }
  }).then(() => {
    return getAccessibleTicketById(input.ticketId, input.adminId);
  });
};

export const updateTicketAssignment = async (input: UpdateTicketAssignmentInput) => {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: input.ticketId,
      OR: [{ assignedAdminId: null }, { assignedAdminId: input.requestingAdminId }]
    },
    select: {
      id: true,
      assignedAdminId: true
    }
  });

  if (!ticket) {
    return null;
  }

  if (ticket.assignedAdminId === input.adminId) {
    return getAccessibleTicketById(input.ticketId, input.requestingAdminId);
  }

  return prisma.ticket.update({
    where: { id: input.ticketId },
    data: {
      assignedAdminId: input.adminId,
      assignedAt: input.adminId ? new Date() : null
    },
    select: { id: true }
  }).then(() => {
    return getAccessibleTicketById(input.ticketId, input.requestingAdminId);
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

  const statusOrder: TicketStatusValue[] = filters.status
    ? [filters.status]
    : ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  const priorityOrder = filters.priority ? [filters.priority] : adminPriorityOrder;
  const userAssignmentOrder = assignmentOrder;

  const ticketGroups = [];

  for (const status of statusOrder) {
    for (const priority of priorityOrder) {
      for (const assignmentState of userAssignmentOrder) {
        const assignmentWhere =
          assignmentState === null ? { assignedAdminId: null } : { assignedAdminId: { not: null } };

      const tickets = await prisma.ticket.findMany({
        where: {
          ...where,
          status,
          priority,
          ...assignmentWhere
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: userTicketInternalSelect
      });

      ticketGroups.push(tickets);
      }
    }
  }

  const totalCount = await prisma.ticket.count({ where });
  const tickets = ticketGroups
    .flat()
    .slice(pagination.offset, pagination.offset + pagination.limit + 1);
  const detailedTickets = await attachUserTicketDetails(
    tickets.slice(0, pagination.limit),
    userId
  );

  const normalizedTickets = detailedTickets.map(({ read, ...ticket }) => {
    const latestNotificationAt = getLatestUserNotificationAt(ticket);
    const unread =
      latestNotificationAt !== null &&
      (!read || read.lastReadAt.getTime() < latestNotificationAt.getTime());

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

export const listUserTicketNotifications = async (userId: string) => {
  const prisma = getPrisma();

  const tickets = await prisma.ticket.findMany({
    where: {
      userId
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: userTicketInternalSelect
  });
  const detailedTickets = await attachUserTicketDetails(tickets, userId);

  return detailedTickets
    .filter((ticket) => {
      const latestNotificationAt = getLatestUserNotificationAt(ticket);

      return (
        latestNotificationAt !== null &&
        (!ticket.read || ticket.read.lastReadAt.getTime() < latestNotificationAt.getTime())
      );
    })
    .map(({ read, ...ticket }) => ({
      ...ticket,
      unread: true
    }));
};

export const getUserTicketById = async (userId: string, ticketId: string) => {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      userId
    },
    select: userTicketInternalSelect
  });

  if (!ticket) {
    return null;
  }

  const [detailedTicket] = await attachUserTicketDetails([ticket], userId);
  const { read, ...userTicket } = detailedTicket;

  return userTicket;
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
      assignedAt: true
    }
  });

  if (!ticket) {
    return null;
  }

  const latestAdminMessage = await prisma.ticketMessage.findFirst({
    where: {
      ticketId,
      sender: {
        role: "ADMIN"
      }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      createdAt: true,
      sender: {
        select: {
          role: true
        }
      }
    }
  });
  const lastReadAt =
    getLatestUserNotificationAt({
      assignedAt: ticket.assignedAt,
      messages: latestAdminMessage ? [latestAdminMessage] : []
    }) || new Date();

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
