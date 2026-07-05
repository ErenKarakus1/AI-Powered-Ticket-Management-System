import { Router } from "express";
import {
  createTicketController,
  getTicketController,
  listTicketsController
} from "../controllers/ticketController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { userMiddleware } from "../middleware/userMiddleware.js";

const router = Router();

router.post("/tickets", authMiddleware, userMiddleware, createTicketController);
router.get("/tickets", authMiddleware, userMiddleware, listTicketsController);
router.get("/tickets/:id", authMiddleware, userMiddleware, getTicketController);

export default router;
