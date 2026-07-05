import { Router } from "express";
import { databaseHealthController, healthController } from "../controllers/healthController.js";

const router = Router();

router.get("/health", healthController);
router.get("/health/db", databaseHealthController);

export default router;
