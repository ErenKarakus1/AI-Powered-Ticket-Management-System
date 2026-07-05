import type { Response } from "express";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";
import { getTicketById, listAllTickets, updateTicketStatus } from "../services/ticketService.js";

const ticketStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
type TicketStatusValue = (typeof ticketStatuses)[number];

const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

const isTicketStatus = (value: string): value is TicketStatusValue => {
  return ticketStatuses.includes(value as TicketStatusValue);
};

export const listAdminTicketsController = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const tickets = await listAllTickets();
    return res.status(200).json({ tickets });
  } catch {
    return res.status(500).json({ message: "Could not load tickets" });
  }
};

export const getAdminTicketController = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (!isString(id)) {
    return res.status(400).json({ message: "Ticket id is required" });
  }

  try {
    const ticket = await getTicketById(id);

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
  const { status } = req.body as {
    status?: unknown;
  };

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
      status
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json({ ticket });
  } catch {
    return res.status(500).json({ message: "Could not update ticket status" });
  }
};
