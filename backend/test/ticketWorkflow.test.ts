import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Response } from "express";
import { getPrisma } from "../src/config/prisma.js";
import { createUserTicketMessageController } from "../src/controllers/ticketMessageController.js";
import type { AuthenticatedRequest } from "../src/types/authenticatedRequest.js";
import {
  createTicket,
  getUserTicketById,
  listUserTicketNotifications,
  markUserTicketAsRead
} from "../src/services/ticketService.js";

const prisma = getPrisma();
const testRunId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const userEmail = `ticket-user-${testRunId}@example.com`;
const adminEmail = `ticket-admin-${testRunId}@example.com`;

let userId = "";
let adminId = "";

const makeMockResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };

  return response;
};

before(async () => {
  const [user, admin] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Test User",
        email: userEmail,
        passwordHash: "test-password-hash"
      }
    }),
    prisma.user.create({
      data: {
        name: "Test Admin",
        email: adminEmail,
        passwordHash: "test-password-hash",
        role: "ADMIN"
      }
    })
  ]);

  userId = user.id;
  adminId = admin.id;
});

after(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [userEmail, adminEmail]
      }
    }
  });
  await prisma.$disconnect();
});

describe("ticket user workflow", () => {
  it("does not expose AI analysis on user ticket responses", async () => {
    const ticket = await createTicket({
      userId,
      title: "Analysis privacy check",
      description: "This ticket has analysis, but user endpoints must hide it."
    });

    await prisma.ticketAnalysis.create({
      data: {
        ticketId: ticket.id,
        category: "Billing",
        priority: "HIGH",
        summary: "Hidden from user responses."
      }
    });

    const userTicket = await getUserTicketById(userId, ticket.id);

    assert.ok(userTicket);
    assert.equal("analysis" in userTicket, false);
  });

  it("creates and clears user notifications for unread admin messages", async () => {
    const ticket = await createTicket({
      userId,
      title: "Notification check",
      description: "Admin replies should appear as a user notification."
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: adminId,
        body: "Please send a screenshot when you can."
      }
    });

    const unreadNotifications = await listUserTicketNotifications(userId);
    assert.ok(unreadNotifications.some((notification) => notification.id === ticket.id));

    await markUserTicketAsRead(userId, ticket.id);

    const readNotifications = await listUserTicketNotifications(userId);
    assert.equal(readNotifications.some((notification) => notification.id === ticket.id), false);
  });

  it("prevents users from replying to closed tickets", async () => {
    const ticket = await prisma.ticket.create({
      data: {
        userId,
        title: "Closed reply check",
        description: "Users should not be able to reply once the ticket is closed.",
        status: "CLOSED"
      }
    });

    const request = {
      params: { id: ticket.id },
      user: { userId, role: "USER" },
      body: { body: "Can I still reply?" }
    } as unknown as AuthenticatedRequest;
    const response = makeMockResponse();

    await createUserTicketMessageController(request, response as unknown as Response);

    const messageCount = await prisma.ticketMessage.count({
      where: { ticketId: ticket.id }
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.body, { message: "Closed tickets are read-only" });
    assert.equal(messageCount, 0);
  });
});
