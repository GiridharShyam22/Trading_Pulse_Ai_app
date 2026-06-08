import { Router } from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = Router();

/**
 * GET /api/admin/users
 * Fetch all registered users (protected, admin only).
 */
router.get("/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({})
      .select("username email role balance fundRequested createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("[Admin] Fetch users error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch users",
    });
  }
});

/**
 * POST /api/admin/add-funds/:userId
 * Add ₹1,00,000 to a user's balance (protected, admin only).
 */
router.post("/add-funds/:userId", protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const FUND_AMOUNT = 100000;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    user.balance += FUND_AMOUNT;
    user.fundRequested = false;
    await user.save();

    console.log(
      `[Admin] ✅ Added ₹${FUND_AMOUNT.toLocaleString("en-IN")} to ${user.username} (new balance: ₹${user.balance.toLocaleString("en-IN")})`
    );

    return res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        username: user.username,
        newBalance: user.balance,
        amountAdded: FUND_AMOUNT,
      },
    });
  } catch (error) {
    console.error("[Admin] Add funds error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to add funds",
    });
  }
});

export default router;
