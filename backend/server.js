console.log("[Init] Booting server.js...");

import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import tradeRoutes from "./routes/tradeRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { initBinanceSocket, getLatestPrices, addActiveRoom, removeActiveRoom, getMemoryStats } from "./services/binanceSocket.js";
import { initNewsService, getRecentNews } from "./services/newsService.js";
import { initFinnhubService } from "./services/finnhubService.js";
import User from "./models/User.js";
import Tick from "./models/Tick.js";

// ── Load environment variables ──────────────────────────────────
dotenv.config();

const PORT = process.env.PORT || 5005;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tradingapp";

// ── Express setup ───────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// CORS — allow frontend dev server and production
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "https://trading-pulse-ai-app.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// ── Socket.io setup ─────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "https://trading-pulse-ai-app.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Send current prices immediately on connect
  const currentPrices = getLatestPrices();
  if (currentPrices.BTCUSDT.price > 0 || currentPrices.ETHUSDT.price > 0) {
    socket.emit("market_update", {
      prices: currentPrices,
      timestamp: Date.now(),
    });
  }

  // ── On-Demand: Subscribe to a specific asset's room ──────────
  socket.on("subscribe_asset", (symbol) => {
    if (!symbol || typeof symbol !== "string") return;
    const room = `room:${symbol.toUpperCase()}`;
    socket.join(room);
    addActiveRoom(symbol.toUpperCase());
    console.log(`[Socket.io] ${socket.id} subscribed to ${room}`);
  });

  // ── On-Demand: Unsubscribe from an asset's room ──────────────
  socket.on("unsubscribe_asset", (symbol) => {
    if (!symbol || typeof symbol !== "string") return;
    const room = `room:${symbol.toUpperCase()}`;
    socket.leave(room);
    // Only remove active room if no one else is watching
    const roomMembers = io.sockets.adapter.rooms.get(room);
    if (!roomMembers || roomMembers.size === 0) {
      removeActiveRoom(symbol.toUpperCase());
    }
    console.log(`[Socket.io] ${socket.id} unsubscribed from ${room}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[Socket.io] Client disconnected: ${socket.id} (${reason})`);
    // Clean up rooms — Socket.io handles leave automatically,
    // but we need to check if any rooms are now empty
  });
});

// ── API Routes ──────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/user", userRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Endpoint for AI engine & UI — get price history for a symbol from Database
app.get("/api/prices/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const count = parseInt(req.query.count) || 50;
    
    // Query MongoDB Time Series: Get latest N ticks, sorted newest to oldest
    const ticks = await Tick.find({ symbol })
      .sort({ timestamp: -1 })
      .limit(count)
      .lean();
    
    // Reverse so it's oldest to newest for the chart
    ticks.reverse();

    res.status(200).json({
      success: true,
      data: {
        symbol,
        prices: ticks.map((t) => t.price),
        timestamps: ticks.map((t) => new Date(t.timestamp).getTime()),
        count: ticks.length,
      },
    });
  } catch (error) {
    console.error(`[API] Error fetching history for ${req.params.symbol}:`, error.message);
    res.status(500).json({ success: false, error: "Failed to fetch price history" });
  }
});

// Endpoint for recent news
app.get("/api/news", (req, res) => {
  res.status(200).json({
    success: true,
    data: getRecentNews(),
  });
});

// Memory stats endpoint (for debugging on Render)
app.get("/api/debug/memory", (req, res) => {
  res.status(200).json({
    success: true,
    data: getMemoryStats(),
  });
});

// ── MongoDB connection & server start ───────────────────────────
async function startServer() {
  try {
    // Start HTTP server FIRST so Render port scanner doesn't time out
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`\n${"═".repeat(55)}`);
      console.log(`  🚀 Trading Dashboard Backend`);
      console.log(`  📡 Server:    http://0.0.0.0:${PORT}`);
      console.log(`  🔌 Socket.io: ws://0.0.0.0:${PORT}`);
      console.log(`${"═".repeat(55)}\n`);
    });

    // Connect to MongoDB
    console.log("[MongoDB] Connecting...");
    await mongoose.connect(MONGODB_URI);
    console.log("[MongoDB] ✅ Connected to MongoDB");

    // Force update or create the admin user to ensure correct credentials
    const adminEmail = "giridharsyamsamsani@gmail.com";
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (adminUser) {
      // Update existing user with new admin credentials
      adminUser.username = "GIRIDHAR SHYAM";
      adminUser.password = "GIRI@2006"; // The pre-save hook will hash this!
      adminUser.role = "admin";
      await adminUser.save();
      console.log(`[Setup] ✅ Admin credentials updated: ${adminUser.username} (${adminUser.email})`);
    } else {
      // If the email doesn't exist, check if the old demo admin exists and update it, or create a new one
      let oldAdmin = await User.findOne({ email: "admin@tradingpulse.com" });
      if (oldAdmin) {
        oldAdmin.username = "GIRIDHAR SHYAM";
        oldAdmin.email = adminEmail;
        oldAdmin.password = "GIRI@2006";
        oldAdmin.role = "admin";
        await oldAdmin.save();
        console.log(`[Setup] ✅ Old admin updated to new credentials: ${oldAdmin.email}`);
      } else {
        await User.create({
          username: "GIRIDHAR SHYAM",
          email: adminEmail,
          password: "GIRI@2006",
          role: "admin",
          balance: 100000,
          portfolio: new Map(),
        });
        console.log(`[Setup] ✅ Default admin created: GIRIDHAR SHYAM (${adminEmail})`);
      }
    }

    // Initialize Binance WebSocket and wire to Socket.io
    const cleanupBinance = await initBinanceSocket(io);

    // Initialize Finnhub WebSocket for real US stock data
    const cleanupFinnhub = initFinnhubService();

    // Initialize News Service
    const cleanupNews = initNewsService(io);

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
      cleanupBinance();
      cleanupFinnhub();
      cleanupNews();
      io.close();
      server.close();
      await mongoose.connection.close();
      console.log("[Server] Goodbye.");
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("[Server] ❌ Failed to start:", error.message);
    process.exit(1);
  }
}

startServer();
