import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const JWT_EXPIRES_IN = "7d";

/**
 * Generate a signed JWT token for a user.
 * @param {Object} user - Mongoose user document
 * @returns {string} Signed JWT
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * POST /api/auth/register
 * Register a new user account.
 * Body: { username, email, password }
 */
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ── Validation ──────────────────────────────────────────────
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields are required: username, email, password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    // ── Check for existing user ─────────────────────────────────
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists",
      });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        error: "This username is already taken",
      });
    }

    // ── Create user (password is hashed by pre-save hook) ───────
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
      role: "user",
      balance: 100000,
      portfolio: new Map(),
    });

    // ── Generate JWT ────────────────────────────────────────────
    const token = generateToken(user);

    console.log(`[Auth] ✅ New user registered: ${user.username} (${user.email})`);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          balance: user.balance,
        },
        token,
      },
    });
  } catch (error) {
    console.error("[Auth] Registration error:", error.message);

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        error: `This ${field} is already in use`,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Registration failed. Please try again.",
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticate a user and return a JWT.
 * Body: { email, password }
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Validation ──────────────────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // ── Find user by email (include password for comparison) ────
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // ── Verify password ─────────────────────────────────────────
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // ── Generate JWT ────────────────────────────────────────────
    const token = generateToken(user);

    console.log(`[Auth] ✅ User logged in: ${user.username} (${user.email})`);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          balance: user.balance,
        },
        token,
      },
    });
  } catch (error) {
    console.error("[Auth] Login error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Login failed. Please try again.",
    });
  }
};

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile.
 * Requires: protect middleware
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const portfolio =
      user.portfolio instanceof Map
        ? Object.fromEntries(user.portfolio)
        : user.portfolio || {};

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
        fundRequested: user.fundRequested || false,
        portfolio,
        equityHistory: user.equityHistory || [],
      },
    });
  } catch (error) {
    console.error("[Auth] getMe error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
    });
  }
};
