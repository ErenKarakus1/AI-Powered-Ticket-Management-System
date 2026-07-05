import { Router } from "express";
import {
  getAdminTicketController,
  getTicketStatsController,
  listAdminTicketsController,
  updateAdminTicketPriorityController,
  updateAdminTicketStatusController
} from "../controllers/adminTicketController.js";
import {
  createAdminTicketMessageController,
  listAdminTicketMessagesController
} from "../controllers/ticketMessageController.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/admin/tickets", authMiddleware, adminMiddleware, listAdminTicketsController);
router.get("/admin/tickets/stats", authMiddleware, adminMiddleware, getTicketStatsController);
router.get("/admin/tickets/:id", authMiddleware, adminMiddleware, getAdminTicketController);
router.patch("/admin/tickets/:id/status", authMiddleware, adminMiddleware, updateAdminTicketStatusController);
router.patch("/admin/tickets/:id/priority", authMiddleware, adminMiddleware, updateAdminTicketPriorityController);
router.get("/admin/tickets/:id/messages", authMiddleware, adminMiddleware, listAdminTicketMessagesController);
router.post("/admin/tickets/:id/messages", authMiddleware, adminMiddleware, createAdminTicketMessageController);

export default router;
