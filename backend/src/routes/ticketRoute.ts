import { Router } from "express";
import {
  createTicketController,
  getTicketController,
  listTicketsController
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
router.get("/tickets/:id", authMiddleware, userMiddleware, getTicketController);
router.get("/tickets/:id/messages", authMiddleware, userMiddleware, listUserTicketMessagesController);
router.post("/tickets/:id/messages", authMiddleware, userMiddleware, createUserTicketMessageController);

export default router;
