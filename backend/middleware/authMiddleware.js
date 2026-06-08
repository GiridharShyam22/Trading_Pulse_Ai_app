import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

/**
 * protect — Verify JWT token from Authorization header.
 * Attaches decoded user info to req.user.
 */
export const protect = async (req, res, next) => {
  try {
    let token = null;

    // Extract token from "Bearer <token>" header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Not authorized — no token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Confirm user still exists in the database
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Not authorized — user no longer exists",
      });
    }

    // Attach user to request object for downstream handlers
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Not authorized — invalid token",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Not authorized — token expired",
      });
    }
    console.error("[AuthMiddleware] Error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

/**
 * adminOnly — Ensure the authenticated user has admin role.
 * Must be used AFTER protect middleware.
 */
export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied — admin privileges required",
    });
  }
  next();
};
