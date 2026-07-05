import { Router } from "express";
import {
  getAdminTicketController,
  listAdminTicketsController,
  updateAdminTicketStatusController
} from "../controllers/adminTicketController.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/admin/tickets", authMiddleware, adminMiddleware, listAdminTicketsController);
router.get("/admin/tickets/:id", authMiddleware, adminMiddleware, getAdminTicketController);
router.patch("/admin/tickets/:id/status", authMiddleware, adminMiddleware, updateAdminTicketStatusController);

export default router;
