import { Router } from "express";
import { loginController, registerController } from "../controllers/authController.js";
import { loginRateLimit, registerRateLimit } from "../middleware/rateLimitMiddleware.js";

const router = Router();

router.post("/auth/register", registerRateLimit, registerController);
router.post("/auth/login", loginRateLimit, loginController);

export default router;
