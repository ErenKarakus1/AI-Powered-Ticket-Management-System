import type { Response } from "express";
import { analyzeTicketWithAi } from "../services/aiAnalysisService.js";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";
import {
  createTicket,
  getUserTicketById,
  listUserTickets,
  markUserTicketAsRead
} from "../services/ticketService.js";

const ticketStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const ticketPriorities = ["UNASSIGNED", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;
type TicketStatusValue = (typeof ticketStatuses)[number];
type TicketPriorityValue = (typeof ticketPriorities)[number];

const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

const parsePagination = (query: AuthenticatedRequest["query"]) => {
  const limitValue = isString(query.limit) ? Number(query.limit) : 10;
  const offsetValue = isString(query.offset) ? Number(query.offset) : 0;

  if (
    !Number.isInteger(limitValue) ||
    !Number.isInteger(offsetValue) ||
    limitValue < 1 ||
    limitValue > 50 ||
    offsetValue < 0
  ) {
    return null;
  }

  return {
    limit: limitValue,
    offset: offsetValue
  };
};

const isTicketStatus = (value: string): value is TicketStatusValue => {
  return ticketStatuses.includes(value as TicketStatusValue);
};

const isTicketPriority = (value: string): value is TicketPriorityValue => {
  return ticketPriorities.includes(value as TicketPriorityValue);
};

const parseTicketFilters = (
  query: AuthenticatedRequest["query"]
): { status?: TicketStatusValue; priority?: TicketPriorityValue; search?: string } | null => {
  const status = isString(query.status) ? query.status : undefined;
  const priority = isString(query.priority) ? query.priority : undefined;
  const search = isString(query.search) ? query.search.trim() : undefined;

  if (status && !isTicketStatus(status)) {
    return null;
  }

  if (priority && !isTicketPriority(priority)) {
    return null;
  }

  if (search && search.length > 120) {
    return null;
  }

  return {
    status: status as TicketStatusValue | undefined,
    priority: priority as TicketPriorityValue | undefined,
    search: search || undefined
  };
};

const getUserId = (req: AuthenticatedRequest) => {
  return req.user?.userId;
};

export const createTicketController = async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  const { title, description } = req.body as {
    title?: unknown;
    description?: unknown;
  };

  if (!isString(title) || !isString(description)) {
    return res.status(400).json({ message: "Title and description are required" });
  }

  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  if (trimmedTitle.length < 3 || trimmedTitle.length > 120) {
    return res.status(400).json({ message: "Title must be between 3 and 120 characters" });
  }

  if (trimmedDescription.length < 10 || trimmedDescription.length > 5000) {
    return res.status(400).json({ message: "Description must be between 10 and 5000 characters" });
  }

  try {
    const ticket = await createTicket({
      userId,
      title: trimmedTitle,
      description: trimmedDescription
    });

    void analyzeTicketWithAi({
      ticketId: ticket.id,
      title: ticket.title,
      description: ticket.description
    }).catch((error) => {
      console.error("AI ticket analysis failed", error);
    });

    return res.status(201).json({ ticket });
  } catch {
    return res.status(500).json({ message: "Ticket creation failed" });
  }
};

export const listTicketsController = async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  const pagination = parsePagination(req.query);
  const filters = parseTicketFilters(req.query);

  if (!pagination) {
    return res.status(400).json({ message: "Limit must be 1-50 and offset must be 0 or greater" });
  }

  if (!filters) {
    return res.status(400).json({ message: "Invalid ticket status, priority, or search filter" });
  }

  try {
    const result = await listUserTickets(userId, pagination, filters);
    return res.status(200).json({
      tickets: result.tickets,
      hasMore: result.hasMore,
      nextOffset: pagination.offset + result.tickets.length,
      totalCount: result.totalCount
    });
  } catch {
    return res.status(500).json({ message: "Could not load tickets" });
  }
};

export const getTicketController = async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  const { id } = req.params;

  if (!isString(id)) {
    return res.status(400).json({ message: "Ticket id is required" });
  }

  try {
    const ticket = await getUserTicketById(userId, id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json({ ticket });
  } catch {
    return res.status(500).json({ message: "Could not load ticket" });
  }
};

export const markTicketReadController = async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  const { id } = req.params;

  if (!isString(id)) {
    return res.status(400).json({ message: "Ticket id is required" });
  }

  try {
    const ticketRead = await markUserTicketAsRead(userId, id);

    if (!ticketRead) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json({ ticketRead });
  } catch {
    return res.status(500).json({ message: "Could not mark ticket as read" });
  }
};
