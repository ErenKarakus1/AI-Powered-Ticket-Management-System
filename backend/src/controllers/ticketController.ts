import type { Response } from "express";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";
import { createTicket, getUserTicketById, listUserTickets } from "../services/ticketService.js";

const isString = (value: unknown): value is string => {
  return typeof value === "string";
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

  try {
    const tickets = await listUserTickets(userId);
    return res.status(200).json({ tickets });
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
