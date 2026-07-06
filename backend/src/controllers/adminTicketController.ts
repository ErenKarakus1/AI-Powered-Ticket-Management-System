import type { Response } from "express";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";
import {
  getAccessibleTicketById,
  getTicketStats,
  listAllTickets,
  updateTicketAssignment,
  updateTicketPriority,
  updateTicketStatus
} from "../services/ticketService.js";

const ticketStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const ticketPriorities = ["UNASSIGNED", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const ticketAssignmentFilters = ["ALL", "UNASSIGNED", "MINE"] as const;
type TicketStatusValue = (typeof ticketStatuses)[number];
type TicketPriorityValue = (typeof ticketPriorities)[number];
type TicketAssignmentFilterValue = (typeof ticketAssignmentFilters)[number];

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

const isTicketAssignmentFilter = (value: string): value is TicketAssignmentFilterValue => {
  return ticketAssignmentFilters.includes(value as TicketAssignmentFilterValue);
};

const parseAdminTicketFilters = (
  query: AuthenticatedRequest["query"]
): {
  status?: TicketStatusValue;
  priority?: TicketPriorityValue;
  search?: string;
  assignment?: TicketAssignmentFilterValue;
} | null => {
  const status = isString(query.status) ? query.status : undefined;
  const priority = isString(query.priority) ? query.priority : undefined;
  const search = isString(query.search) ? query.search.trim() : undefined;
  const assignment = isString(query.assignment) ? query.assignment : undefined;

  if (status && !isTicketStatus(status)) {
    return null;
  }

  if (priority && !isTicketPriority(priority)) {
    return null;
  }

  if (search && search.length > 120) {
    return null;
  }

  if (assignment && !isTicketAssignmentFilter(assignment)) {
    return null;
  }

  return {
    status: status as TicketStatusValue | undefined,
    priority: priority as TicketPriorityValue | undefined,
    search: search || undefined,
    assignment: assignment as TicketAssignmentFilterValue | undefined
  };
};

export const listAdminTicketsController = async (req: AuthenticatedRequest, res: Response) => {
  const pagination = parsePagination(req.query);
  const filters = parseAdminTicketFilters(req.query);

  if (!pagination) {
    return res.status(400).json({ message: "Limit must be 1-50 and offset must be 0 or greater" });
  }

  if (!filters) {
    return res.status(400).json({ message: "Invalid ticket status, priority, or search filter" });
  }

  try {
    const result = await listAllTickets(pagination, filters, req.user?.userId);
    return res.status(200).json({
      tickets: result.tickets,
      hasMore: result.hasMore,
      nextOffset: pagination.offset + result.tickets.length
    });
  } catch {
    return res.status(500).json({ message: "Could not load tickets" });
  }
};

export const updateAdminTicketAssignmentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.params;
  const { assignedToMe } = req.body as {
    assignedToMe?: unknown;
  };
  const adminId = req.user?.userId;

  if (!adminId) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  if (!isString(id)) {
    return res.status(400).json({ message: "Ticket id is required" });
  }

  if (typeof assignedToMe !== "boolean") {
    return res.status(400).json({ message: "assignedToMe must be true or false" });
  }

  try {
    const ticket = await updateTicketAssignment({
      ticketId: id,
      adminId: assignedToMe ? adminId : null,
      requestingAdminId: adminId
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json({ ticket });
  } catch {
    return res.status(500).json({ message: "Could not update ticket assignment" });
  }
};

export const getAdminTicketController = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.userId;

  if (!adminId) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  if (!isString(id)) {
    return res.status(400).json({ message: "Ticket id is required" });
  }

  try {
    const ticket = await getAccessibleTicketById(id, adminId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json({ ticket });
  } catch {
    return res.status(500).json({ message: "Could not load ticket" });
  }
};

export const updateAdminTicketStatusController = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.userId;
  const { status } = req.body as {
    status?: unknown;
  };

  if (!adminId) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  if (!isString(id)) {
    return res.status(400).json({ message: "Ticket id is required" });
  }

  if (!isString(status)) {
    return res.status(400).json({ message: "Status is required" });
  }

  if (!isTicketStatus(status)) {
    return res.status(400).json({
      message: "Status must be one of OPEN, IN_PROGRESS, RESOLVED, CLOSED"
    });
  }

  try {
    const ticket = await updateTicketStatus({
      ticketId: id,
      status,
      adminId
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json({ ticket });
  } catch {
    return res.status(500).json({ message: "Could not update ticket status" });
  }
};

export const updateAdminTicketPriorityController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.params;
  const adminId = req.user?.userId;
  const { priority } = req.body as {
    priority?: unknown;
  };

  if (!adminId) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  if (!isString(id)) {
    return res.status(400).json({ message: "Ticket id is required" });
  }

  if (!isString(priority)) {
    return res.status(400).json({ message: "Priority is required" });
  }

  if (!isTicketPriority(priority)) {
    return res.status(400).json({
      message: "Priority must be one of UNASSIGNED, LOW, MEDIUM, HIGH, URGENT"
    });
  }

  try {
    const ticket = await updateTicketPriority({
      ticketId: id,
      priority,
      adminId
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json({ ticket });
  } catch {
    return res.status(500).json({ message: "Could not update ticket priority" });
  }
};

export const getTicketStatsController = async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user?.userId;

  if (!adminId) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  try {
    const ticketStats = await getTicketStats(adminId);
    return res.status(200).json({ ticketStats });
  } catch {
    return res.status(500).json({ message: "Could not load ticket stats" });
  }
};
