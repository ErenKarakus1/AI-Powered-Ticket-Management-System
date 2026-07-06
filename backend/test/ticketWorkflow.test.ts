import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Response } from "express";
import { getPrisma } from "../src/config/prisma.js";
import { createUserTicketMessageController } from "../src/controllers/ticketMessageController.js";
import type { AuthenticatedRequest } from "../src/types/authenticatedRequest.js";
import {
  createTicket,
  getUserTicketById,
  listAllTickets,
  listUserTicketNotifications,
  markUserTicketAsRead,
  updateTicketAssignment
} from "../src/services/ticketService.js";

const prisma = getPrisma();
const testRunId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const userEmail = `ticket-user-${testRunId}@example.com`;
const adminEmail = `ticket-admin-${testRunId}@example.com`;
const otherAdminEmail = `ticket-other-admin-${testRunId}@example.com`;

let userId = "";
let adminId = "";
let otherAdminId = "";

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
  const user = await prisma.user.create({
    data: {
      name: "Test User",
      email: userEmail,
      passwordHash: "test-password-hash"
    }
  });
  const admin = await prisma.user.create({
    data: {
      name: "Test Admin",
      email: adminEmail,
      passwordHash: "test-password-hash",
      role: "ADMIN"
    }
  });
  const otherAdmin = await prisma.user.create({
    data: {
      name: "Other Test Admin",
      email: otherAdminEmail,
      passwordHash: "test-password-hash",
      role: "ADMIN"
    }
  });

  userId = user.id;
  adminId = admin.id;
  otherAdminId = otherAdmin.id;
});

after(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [userEmail, adminEmail, otherAdminEmail]
      }
    }
  });
  await prisma.$disconnect();
});

describe("ticket user workflow", () => {
  it("exposes only the AI category on user ticket responses", async () => {
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
    assert.deepEqual(userTicket.analysis, { category: "Billing" });
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

  it("notifies users when a ticket is assigned", async () => {
    const ticket = await createTicket({
      userId,
      title: "Assignment notification check",
      description: "Users should see a notification when support takes ownership."
    });

    const claimedTicket = await updateTicketAssignment({
      ticketId: ticket.id,
      adminId
    });

    assert.ok(claimedTicket?.assignedAt);

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

  it("lets admins claim, filter, and unassign tickets", async () => {
    const ticket = await createTicket({
      userId,
      title: "Assignment check",
      description: "Admins should be able to claim and release this ticket."
    });

    const claimedTicket = await updateTicketAssignment({
      ticketId: ticket.id,
      adminId
    });

    assert.ok(claimedTicket);
    assert.equal(claimedTicket.assignedAdminId, adminId);
    assert.equal(claimedTicket.assignedAdmin?.id, adminId);

    const repeatedClaim = await updateTicketAssignment({
      ticketId: ticket.id,
      adminId
    });
    assert.ok(repeatedClaim?.assignedAt);
    assert.equal(repeatedClaim.assignedAt.getTime(), claimedTicket.assignedAt?.getTime());

    const assignedToMe = await listAllTickets(
      { limit: 10, offset: 0 },
      { assignment: "MINE", search: "Assignment check" },
      adminId
    );
    assert.ok(assignedToMe.tickets.some((adminTicket) => adminTicket.id === ticket.id));

    const unassignedBeforeRelease = await listAllTickets(
      { limit: 10, offset: 0 },
      { assignment: "UNASSIGNED", search: "Assignment check" },
      adminId
    );
    assert.equal(
      unassignedBeforeRelease.tickets.some((adminTicket) => adminTicket.id === ticket.id),
      false
    );

    const releasedTicket = await updateTicketAssignment({
      ticketId: ticket.id,
      adminId: null
    });

    assert.ok(releasedTicket);
    assert.equal(releasedTicket.assignedAdminId, null);
    assert.equal(releasedTicket.assignedAdmin, null);
  });

  it("hides tickets assigned to other admins from the admin queue", async () => {
    const ticket = await createTicket({
      userId,
      title: "Other admin assignment check",
      description: "Admins should not see tickets assigned to someone else."
    });

    await updateTicketAssignment({
      ticketId: ticket.id,
      adminId: otherAdminId
    });

    const adminQueue = await listAllTickets(
      { limit: 20, offset: 0 },
      { search: "Other admin assignment check" },
      adminId
    );
    assert.equal(adminQueue.tickets.some((adminTicket) => adminTicket.id === ticket.id), false);

    const otherAdminQueue = await listAllTickets(
      { limit: 20, offset: 0 },
      { search: "Other admin assignment check" },
      otherAdminId
    );
    assert.equal(
      otherAdminQueue.tickets.some((adminTicket) => adminTicket.id === ticket.id),
      true
    );
  });

  it("sorts admin tickets by status, urgency, assignment, and oldest creation time", async () => {
    const closedUrgent = await createTicket({
      userId,
      title: "Sort closed urgent",
      description: "Closed urgent should come after open tickets because status wins first."
    });
    const openLowUnassigned = await createTicket({
      userId,
      title: "Sort open low unassigned",
      description: "Open low unassigned should come before assigned low tickets."
    });
    const openUrgentAssigned = await createTicket({
      userId,
      title: "Sort open urgent assigned",
      description: "Open urgent assigned should come after open urgent unassigned."
    });
    const openUrgentUnassignedOlder = await createTicket({
      userId,
      title: "Sort open urgent unassigned older",
      description: "Older open urgent unassigned ticket should come first in its group."
    });
    const openUrgentUnassignedNewer = await createTicket({
      userId,
      title: "Sort open urgent unassigned newer",
      description: "Newer open urgent unassigned ticket should come second in its group."
    });
    const olderCreatedAt = new Date("2026-01-01T00:00:00.000Z");
    const newerCreatedAt = new Date("2026-01-02T00:00:00.000Z");

    await prisma.ticket.update({
      where: { id: closedUrgent.id },
      data: { status: "CLOSED", priority: "URGENT" }
    });
    await prisma.ticket.update({
      where: { id: openLowUnassigned.id },
      data: { priority: "LOW" }
    });
    await prisma.ticket.update({
      where: { id: openUrgentAssigned.id },
      data: { priority: "URGENT", assignedAdminId: adminId, assignedAt: new Date() }
    });
    await prisma.ticket.update({
      where: { id: openUrgentUnassignedOlder.id },
      data: { priority: "URGENT", createdAt: olderCreatedAt }
    });
    await prisma.ticket.update({
      where: { id: openUrgentUnassignedNewer.id },
      data: { priority: "URGENT", createdAt: newerCreatedAt }
    });

    const result = await listAllTickets({ limit: 50, offset: 0 }, {}, adminId);
    const sortedIds = result.tickets.map((ticket) => ticket.id);

    assert.ok(
      sortedIds.indexOf(openUrgentUnassignedOlder.id) <
        sortedIds.indexOf(openUrgentUnassignedNewer.id)
    );
    assert.ok(
      sortedIds.indexOf(openUrgentUnassignedNewer.id) < sortedIds.indexOf(openUrgentAssigned.id)
    );
    assert.ok(sortedIds.indexOf(openUrgentAssigned.id) < sortedIds.indexOf(openLowUnassigned.id));
    assert.ok(sortedIds.indexOf(openLowUnassigned.id) < sortedIds.indexOf(closedUrgent.id));
  });
});
