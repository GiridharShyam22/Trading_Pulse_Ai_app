import { Router } from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// POST /api/auth/register  — Create a new account
router.post("/register", register);

// POST /api/auth/login     — Authenticate and get JWT
router.post("/login", login);

// GET  /api/auth/me        — Get current user profile (protected)
router.get("/me", protect, getMe);

export default router;
