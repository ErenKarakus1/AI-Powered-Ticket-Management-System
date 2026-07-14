import { Router } from "express";
import {
  getAdminTicketController,
  getTicketStatsController,
  listAdminTicketsController,
  updateAdminTicketAssignmentController,
  updateAdminTicketPriorityController,
  updateAdminTicketStatusController
} from "../controllers/adminTicketController.js";
import {
  createAdminTicketMessageController,
  listAdminTicketMessagesController
} from "../controllers/ticketMessageController.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { ticketMessageRateLimit } from "../middleware/rateLimitMiddleware.js";

const router = Router();

router.get("/admin/tickets", authMiddleware, adminMiddleware, listAdminTicketsController);
router.get("/admin/tickets/stats", authMiddleware, adminMiddleware, getTicketStatsController);
router.get("/admin/tickets/:id", authMiddleware, adminMiddleware, getAdminTicketController);
router.patch("/admin/tickets/:id/status", authMiddleware, adminMiddleware, updateAdminTicketStatusController);
router.patch("/admin/tickets/:id/priority", authMiddleware, adminMiddleware, updateAdminTicketPriorityController);
router.patch("/admin/tickets/:id/assignment", authMiddleware, adminMiddleware, updateAdminTicketAssignmentController);
router.get("/admin/tickets/:id/messages", authMiddleware, adminMiddleware, listAdminTicketMessagesController);
router.post(
  "/admin/tickets/:id/messages",
  authMiddleware,
  adminMiddleware,
  ticketMessageRateLimit,
  createAdminTicketMessageController
);

export default router;
