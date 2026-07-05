import { Router } from "express";
import {
  createTicketController,
  getTicketController,
  listTicketsController
} from "../controllers/ticketController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/tickets", authMiddleware, createTicketController);
router.get("/tickets", authMiddleware, listTicketsController);
router.get("/tickets/:id", authMiddleware, getTicketController);

export default router;
