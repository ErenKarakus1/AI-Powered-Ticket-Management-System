import { Router } from "express";
import {
  createTicketController,
  getTicketController,
  listTicketNotificationsController,
  listTicketsController,
  markTicketReadController
} from "../controllers/ticketController.js";
import {
  createUserTicketMessageController,
  listUserTicketMessagesController
} from "../controllers/ticketMessageController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { userMiddleware } from "../middleware/userMiddleware.js";

const router = Router();

router.post("/tickets", authMiddleware, userMiddleware, createTicketController);
router.get("/tickets", authMiddleware, userMiddleware, listTicketsController);
router.get(
  "/tickets/notifications",
  authMiddleware,
  userMiddleware,
  listTicketNotificationsController
);
router.get("/tickets/:id", authMiddleware, userMiddleware, getTicketController);
router.patch("/tickets/:id/read", authMiddleware, userMiddleware, markTicketReadController);
router.get("/tickets/:id/messages", authMiddleware, userMiddleware, listUserTicketMessagesController);
router.post("/tickets/:id/messages", authMiddleware, userMiddleware, createUserTicketMessageController);

export default router;
