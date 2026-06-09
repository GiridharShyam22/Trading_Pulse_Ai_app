import WebSocket from "ws";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { getActiveSentiment } from "./newsService.js";

/**
 * Binance WebSocket Service (v2 — On-Demand Architecture)
 *
 * - Connects to Binance live trade streams for crypto pairs.
 * - Exposes updatePrice() so external services (Finnhub) can feed prices.
 * - Emits room-based "asset_update" to subscribed clients only.
 * - Emits lightweight "market_update" (ticker tape) to all clients every 2s.
 * - Smart memory: 200 ticks for watched symbols, 150 for unwatched.
 */

// ── Symbol Configuration ────────────────────────────────────────
const SYMBOLS_CONFIG = {
  // Crypto — real data from Binance WebSocket
  BTCUSDT:  { basePrice: 67500,   source: "binance" },
  ETHUSDT:  { basePrice: 3450,    source: "binance" },
  BNBUSDT:  { basePrice: 600.50,  source: "binance" },
  SOLUSDT:  { basePrice: 150.25,  source: "binance" },

  // US Stocks — real data from Finnhub (when connected)
  AAPL:     { basePrice: 185.50,  source: "finnhub" },
  MSFT:     { basePrice: 415.20,  source: "finnhub" },
  GOOGL:    { basePrice: 172.30,  source: "finnhub" },
  AMZN:     { basePrice: 180.10,  source: "finnhub" },
  TSLA:     { basePrice: 175.40,  source: "finnhub" },
  NVDA:     { basePrice: 920.80,  source: "finnhub" },
  META:     { basePrice: 495.60,  source: "finnhub" },
  NFLX:     { basePrice: 610.15,  source: "finnhub" },
  AMD:      { basePrice: 160.20,  source: "finnhub" },
  PLTR:     { basePrice: 22.45,   source: "finnhub" },
  COIN:     { basePrice: 200.15,  source: "finnhub" },

  // Indian Stocks — simulated (NSE/BSE not available on Finnhub free tier)
  RELIANCE: { basePrice: 2900.50, source: "simulator" },
  TCS:      { basePrice: 3800.20, source: "simulator" },
  HDFCBANK: { basePrice: 1500.10, source: "simulator" },
  INFY:     { basePrice: 1400.30, source: "simulator" },
  SBIN:     { basePrice: 800.50,  source: "simulator" },
};

const ALL_SYMBOLS = Object.keys(SYMBOLS_CONFIG);
const BINANCE_SYMBOLS = ALL_SYMBOLS.filter(s => SYMBOLS_CONFIG[s].source === "binance");
const SIMULATOR_SYMBOLS = ALL_SYMBOLS.filter(s => SYMBOLS_CONFIG[s].source === "simulator");
const FINNHUB_SYMBOLS = ALL_SYMBOLS.filter(s => SYMBOLS_CONFIG[s].source === "finnhub");

const BINANCE_WS_URL =
  "wss://stream.binance.com:9443/ws/" +
  BINANCE_SYMBOLS.map(s => s.toLowerCase() + "@trade").join("/");

// ── In-memory price stores (config-driven) ──────────────────────
const latestPrices = {};
const priceHistory = {};

for (const symbol of ALL_SYMBOLS) {
  latestPrices[symbol] = { price: 0, timestamp: 0, volume24h: 0 };
  priceHistory[symbol] = [];
}

const MAX_HISTORY_WATCHED = 200;
const MAX_HISTORY_UNWATCHED = 150;
const TICKER_INTERVAL_MS = 2000;  // Broadcast ticker tape every 2s
const ROOM_INTERVAL_MS = 1000;    // Room-based updates every 1s

// Track which symbols have active watchers (rooms with clients)
const activeRooms = new Set();

let ws = null;
let reconnectTimer = null;
let tickerTimer = null;
let roomTimer = null;
let pendingTicker = false;

// Track which symbols received a Finnhub price (fallback to simulator if not)
const finnhubActive = new Set();

// ── Pre-populate history ────────────────────────────────────────
function prefillHistory(symbol, basePrice) {
  let currentPrice = basePrice;
  let timestamp = Date.now() - 150 * 1000;
  const history = [];
  for (let i = 0; i < 150; i++) {
    const change = (Math.random() - 0.5) * 0.005;
    currentPrice = currentPrice * (1 + change);
    history.push({
      price: parseFloat(currentPrice.toFixed(2)),
      timestamp: timestamp + i * 1000,
      volume: Math.floor(Math.random() * 10) + 1,
    });
  }
  priceHistory[symbol] = history;
  latestPrices[symbol].price = parseFloat(currentPrice.toFixed(2));
  latestPrices[symbol].timestamp = Date.now();
}

function prefillAllHistory() {
  for (const symbol of ALL_SYMBOLS) {
    prefillHistory(symbol, SYMBOLS_CONFIG[symbol].basePrice);
  }
}

prefillAllHistory();

// ── Public API ──────────────────────────────────────────────────
export function getLatestPrices() {
  return { ...latestPrices };
}

export function getPriceHistory(symbol, count = 50) {
  const history = priceHistory[symbol] || [];
  return history.slice(-count);
}

/**
 * External price feed (used by Finnhub service).
 * @param {string} symbol
 * @param {number} price
 * @param {number} volume
 */
export function updatePrice(symbol, price, volume = 1) {
  if (!latestPrices[symbol]) return;

  const timestamp = Date.now();
  latestPrices[symbol] = {
    price,
    timestamp,
    volume24h: latestPrices[symbol].volume24h + volume,
  };

  priceHistory[symbol].push({ price, timestamp, volume });

  // Smart trim based on whether symbol is actively watched
  const maxLen = activeRooms.has(symbol) ? MAX_HISTORY_WATCHED : MAX_HISTORY_UNWATCHED;
  if (priceHistory[symbol].length > maxLen) {
    priceHistory[symbol] = priceHistory[symbol].slice(-maxLen);
  }

  finnhubActive.add(symbol);
}

/**
 * Track a room as active (a client is watching this symbol).
 */
export function addActiveRoom(symbol) {
  activeRooms.add(symbol);
}

/**
 * Remove a room from active tracking.
 */
export function removeActiveRoom(symbol) {
  activeRooms.delete(symbol);
}

/**
 * Memory stats for debugging on Render.
 */
export function getMemoryStats() {
  let totalTicks = 0;
  const perSymbol = {};
  for (const symbol of ALL_SYMBOLS) {
    const count = (priceHistory[symbol] || []).length;
    perSymbol[symbol] = count;
    totalTicks += count;
  }
  const memUsage = process.memoryUsage();
  return {
    totalTicks,
    activeRooms: [...activeRooms],
    perSymbol,
    heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
    rssMB: (memUsage.rss / 1024 / 1024).toFixed(2),
  };
}

// ── SL/TP Scanner ───────────────────────────────────────────────
async function checkSLTP(io) {
  try {
    const users = await User.find({});
    if (!users || users.length === 0) return;

    for (const user of users) {
      let changed = false;

      for (const [symbol, pos] of user.portfolio.entries()) {
        if (!pos.quantity || pos.quantity <= 0) continue;

        const currentPrice = latestPrices[symbol]?.price;
        if (!currentPrice) continue;

        let triggerType = null;

        if (pos.stopLoss && currentPrice <= pos.stopLoss) {
          triggerType = "stopLoss";
        } else if (pos.takeProfit && currentPrice >= pos.takeProfit) {
          triggerType = "takeProfit";
        }

        if (triggerType) {
          console.log(`[SL/TP Trigger] Liquidating ${pos.quantity} ${symbol} for user ${user.username} via ${triggerType} @ $${currentPrice}`);

          const proceeds = pos.quantity * currentPrice;
          user.balance += proceeds;

          const tx = await Transaction.create({
            userId: user._id,
            symbol,
            type: "sell",
            quantity: pos.quantity,
            price: currentPrice,
            total: proceeds,
            balanceAfter: user.balance,
          });

          user.portfolio.delete(symbol);
          changed = true;

          io.emit("order_liquidated", {
            userId: user._id,
            symbol,
            type: triggerType,
            price: currentPrice,
            quantity: tx.quantity,
            total: proceeds,
            balance: user.balance,
            transaction: tx,
          });
        }
      }

      if (changed) {
        const portfolioValue = user.getPortfolioValue(latestPrices);
        const totalEquity = user.balance + portfolioValue;
        user.equityHistory.push({ equity: totalEquity, timestamp: new Date() });
        if (user.equityHistory.length > 200) {
          user.equityHistory.shift();
        }

        await user.save();

        io.emit("portfolio_update", {
          userId: user._id,
          balance: user.balance,
          portfolio: Object.fromEntries(user.portfolio),
        });
      }
    }
  } catch (err) {
    console.error("[SL/TP Service] Error in checkSLTP:", err.message);
  }
}

// ── Main Init ───────────────────────────────────────────────────
export function initBinanceSocket(io) {

  // ── Ticker tape: lightweight broadcast to ALL clients every 2s ──
  function triggerTickerEmit() {
    if (!pendingTicker) {
      pendingTicker = true;
      tickerTimer = setTimeout(() => {
        io.emit("market_update", {
          prices: { ...latestPrices },
          timestamp: Date.now(),
        });
        pendingTicker = false;
        checkSLTP(io);
      }, TICKER_INTERVAL_MS);
    }
  }

  // ── Room-based: detailed update to subscribed clients every 1s ──
  const roomEmitTimer = setInterval(() => {
    for (const symbol of activeRooms) {
      const price = latestPrices[symbol];
      if (!price || price.price <= 0) continue;

      io.to(`room:${symbol}`).emit("asset_update", {
        symbol,
        price: price.price,
        timestamp: price.timestamp || Date.now(),
        volume24h: price.volume24h,
      });
    }
  }, ROOM_INTERVAL_MS);

  // ── Binance WebSocket ─────────────────────────────────────────
  function connect() {
    console.log("[BinanceWS] Connecting to Binance trade stream...");

    ws = new WebSocket(BINANCE_WS_URL);

    ws.on("open", () => {
      console.log("[BinanceWS] ✅ Connected to Binance WebSocket");
      console.log(`[BinanceWS] Streaming: ${BINANCE_SYMBOLS.join(", ")}`);
    });

    ws.on("message", (data) => {
      try {
        const trade = JSON.parse(data.toString());
        if (trade.e !== "trade") return;

        const symbol = trade.s;
        const price = parseFloat(trade.p);
        const quantity = parseFloat(trade.q);
        const timestamp = trade.T;

        if (!latestPrices[symbol]) return;

        latestPrices[symbol] = {
          price,
          timestamp,
          volume24h: latestPrices[symbol].volume24h + quantity,
        };

        priceHistory[symbol].push({ price, timestamp, volume: quantity });

        const maxLen = activeRooms.has(symbol) ? MAX_HISTORY_WATCHED : MAX_HISTORY_UNWATCHED;
        if (priceHistory[symbol].length > maxLen) {
          priceHistory[symbol] = priceHistory[symbol].slice(-maxLen);
        }

        triggerTickerEmit();
      } catch (error) {
        // Silently ignore malformed messages
      }
    });

    ws.on("error", (error) => {
      console.error("[BinanceWS] ❌ WebSocket error:", error.message);
    });

    ws.on("close", (code, reason) => {
      console.warn(
        `[BinanceWS] ⚠️ Connection closed (code: ${code}). Reconnecting in 5s...`
      );
      clearTimeout(tickerTimer);
      pendingTicker = false;
      reconnectTimer = setTimeout(connect, 5000);
    });
  }

  connect();

  // ── Stock Simulator (Indian stocks + Finnhub fallback) ────────
  const stockSimulatorTimer = setInterval(() => {
    const timestamp = Date.now();

    // Always simulate Indian stocks
    const symbolsToSimulate = [...SIMULATOR_SYMBOLS];

    // Also simulate Finnhub stocks that haven't received real data yet
    for (const s of FINNHUB_SYMBOLS) {
      if (!finnhubActive.has(s)) {
        symbolsToSimulate.push(s);
      }
    }

    symbolsToSimulate.forEach((symbol) => {
      const current = latestPrices[symbol];
      if (!current) return;

      const sentiment = getActiveSentiment(symbol);
      const bias = sentiment * 0.001;
      const change = (Math.random() - 0.5) * 0.004 + bias;
      const newPrice = parseFloat((current.price * (1 + change)).toFixed(2));
      const volume = Math.floor(Math.random() * 50) + 5;

      latestPrices[symbol] = {
        price: newPrice,
        timestamp,
        volume24h: current.volume24h + volume,
      };

      priceHistory[symbol].push({ price: newPrice, timestamp, volume });

      const maxLen = activeRooms.has(symbol) ? MAX_HISTORY_WATCHED : MAX_HISTORY_UNWATCHED;
      if (priceHistory[symbol].length > maxLen) {
        priceHistory[symbol] = priceHistory[symbol].slice(-maxLen);
      }
    });

    triggerTickerEmit();
  }, 1000);

  // ── Cleanup ───────────────────────────────────────────────────
  return function cleanup() {
    console.log("[BinanceWS + StockSimulator] Shutting down...");
    clearTimeout(reconnectTimer);
    clearTimeout(tickerTimer);
    clearInterval(roomEmitTimer);
    clearInterval(stockSimulatorTimer);
    if (ws) {
      ws.removeAllListeners();
      ws.close();
    }
  };
}

export default { initBinanceSocket, getLatestPrices, getPriceHistory, updatePrice, addActiveRoom, removeActiveRoom, getMemoryStats };
