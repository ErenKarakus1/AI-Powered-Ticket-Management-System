import express from "express";
import healthRoutes from "./routes/healthRoute.js";

export const app = express();

app.use(express.json());
app.use(healthRoutes);
