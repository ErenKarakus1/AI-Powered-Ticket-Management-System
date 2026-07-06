import type { Response } from "express";
import {
  createTicketMessage,
  getUserTicketForMessaging,
  listTicketMessages,
  ticketExists,
  userCanAccessTicket
} from "../services/ticketMessageService.js";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";

const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

const getMessageBody = (req: AuthenticatedRequest) => {
  const { body } = req.body as {
    body?: unknown;
  };

  if (!isString(body)) {
    return null;
  }

  return body.trim();
};

const validateMessageBody = (body: string | null) => {
  if (!body) {
    return "Message body is required";
  }

  if (body.length < 1 || body.length > 2000) {
    return "Message body must be between 1 and 2000 characters";
  }

  return null;
};

export const listUserTicketMessagesController = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  if (!isString(id)) {
    return res.status(400).json({ message: "Ticket id is required" });
  }

  try {
    const canAccessTicket = await userCanAccessTicket(userId, id);

    if (!canAccessTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const messages = await listTicketMessages(id);
    return res.status(200).json({ messages });
  } catch {
    return res.status(500).json({ message: "Could not load messages" });
  }
};

export const createUserTicketMessageController = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const body = getMessageBody(req);
  const validationError = validateMessageBody(body);

  if (!userId) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  if (!isString(id)) {
    return res.status(400).json({ message: "Ticket id is required" });
  }

  if (validationError || !body) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const ticket = await getUserTicketForMessaging(userId, id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.status === "CLOSED") {
      return res.status(403).json({ message: "Closed tickets are read-only" });
    }

    const message = await createTicketMessage({
      ticketId: id,
      senderId: userId,
      body
    });

    return res.status(201).json({ message });
  } catch {
    return res.status(500).json({ message: "Could not create message" });
  }
};

export const listAdminTicketMessagesController = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (!isString(id)) {
    return res.status(400).json({ message: "Ticket id is required" });
  }

  try {
    const exists = await ticketExists(id);

    if (!exists) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const messages = await listTicketMessages(id);
    return res.status(200).json({ messages });
  } catch {
    return res.status(500).json({ message: "Could not load messages" });
  }
};

export const createAdminTicketMessageController = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.userId;
  const body = getMessageBody(req);
  const validationError = validateMessageBody(body);

  if (!adminId) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  if (!isString(id)) {
    return res.status(400).json({ message: "Ticket id is required" });
  }

  if (validationError || !body) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const exists = await ticketExists(id);

    if (!exists) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const message = await createTicketMessage({
      ticketId: id,
      senderId: adminId,
      body
    });

    return res.status(201).json({ message });
  } catch {
    return res.status(500).json({ message: "Could not create message" });
  }
};
