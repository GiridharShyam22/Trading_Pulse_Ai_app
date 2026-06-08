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
import { initBinanceSocket, getLatestPrices, getPriceHistory } from "./services/binanceSocket.js";
import { initNewsService, getRecentNews } from "./services/newsService.js";
import User from "./models/User.js";

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
      "https://trading-pulse-ai-7fhs5hui8-giridharshyam22s-projects.vercel.app"
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
      "https://trading-pulse-ai-7fhs5hui8-giridharshyam22s-projects.vercel.app",
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

  socket.on("disconnect", (reason) => {
    console.log(`[Socket.io] Client disconnected: ${socket.id} (${reason})`);
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

// Endpoint for AI engine — get price history for a symbol
app.get("/api/prices/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const count = parseInt(req.query.count) || 50;
  const history = getPriceHistory(symbol, count);

  res.status(200).json({
    success: true,
    data: {
      symbol,
      prices: history.map((p) => p.price),
      timestamps: history.map((p) => p.timestamp),
      count: history.length,
    },
  });
});

// Endpoint for recent news
app.get("/api/news", (req, res) => {
  res.status(200).json({
    success: true,
    data: getRecentNews(),
  });
});

// ── MongoDB connection & server start ───────────────────────────
async function startServer() {
  try {
    // Connect to MongoDB
    console.log("[MongoDB] Connecting...");
    await mongoose.connect(MONGODB_URI);
    console.log("[MongoDB] ✅ Connected to", MONGODB_URI);

    // Create a default admin user if none exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (!existingAdmin) {
      const adminUser = await User.create({
        username: "admin",
        email: "admin@tradingpulse.com",
        password: "admin123",
        role: "admin",
        balance: 100000,
        portfolio: new Map(),
      });
      console.log(
        `[Setup] ✅ Default admin created: ${adminUser.username} (${adminUser.email})`
      );
    } else {
      console.log(
        `[Setup] Admin user exists: ${existingAdmin.username} (${existingAdmin.email})`
      );
    }

    // Initialize Binance WebSocket and wire to Socket.io
    const cleanupBinance = initBinanceSocket(io);

    // Initialize News Service
    const cleanupNews = initNewsService(io);

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`\n${"═".repeat(55)}`);
      console.log(`  🚀 Trading Dashboard Backend`);
      console.log(`  📡 Server:    http://localhost:${PORT}`);
      console.log(`  🔌 Socket.io: ws://localhost:${PORT}`);
      console.log(`  📊 Binance:   Live BTC/ETH stream active`);
      console.log(`${"═".repeat(55)}\n`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
      cleanupBinance();
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
