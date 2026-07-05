import express from "express";
import adminTicketRoutes from "./routes/adminTicketRoute.js";
import authRoutes from "./routes/authRoute.js";
import healthRoutes from "./routes/healthRoute.js";
import ticketRoutes from "./routes/ticketRoute.js";

export const app = express();

app.use(express.json());
app.use(healthRoutes);
app.use(authRoutes);
app.use(ticketRoutes);
app.use(adminTicketRoutes);
