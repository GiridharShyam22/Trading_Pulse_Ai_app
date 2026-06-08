import { Router } from "express";
import {
  getBalance,
  executeTrade,
  getTradeHistory,
  getDefaultUser,
} from "../controllers/tradeController.js";

const router = Router();

// GET  /api/trade/user/default     — Fetch default user profile
router.get("/user/default", getDefaultUser);

// GET  /api/trade/balance/:userId  — Fetch user balance & portfolio
router.get("/balance/:userId", getBalance);

// POST /api/trade/execute          — Execute a buy or sell trade
router.post("/execute", executeTrade);

// GET  /api/trade/history/:userId  — Fetch paginated trade history
router.get("/history/:userId", getTradeHistory);

export default router;
