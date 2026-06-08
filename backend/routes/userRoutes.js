import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = Router();

/**
 * POST /api/user/request-funds
 * Request an additional ₹1,00,000 from the admin.
 */
router.post("/request-funds", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (user.fundRequested) {
      return res.status(400).json({ success: false, error: "You already have a pending fund request." });
    }

    user.fundRequested = true;
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        message: "Fund request submitted successfully. Waiting for admin approval.",
        fundRequested: user.fundRequested
      }
    });
  } catch (error) {
    console.error("[User] Request funds error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to submit fund request."
    });
  }
});

export default router;
