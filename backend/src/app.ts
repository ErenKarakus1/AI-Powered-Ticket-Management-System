import express from "express";
import authRoutes from "./routes/authRoute.js";
import healthRoutes from "./routes/healthRoute.js";

export const app = express();

app.use(express.json());
app.use(healthRoutes);
app.use(authRoutes);
