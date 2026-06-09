import WebSocket from "ws";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { getActiveSentiment } from "./newsService.js";

/**
 * Binance WebSocket Service
 *
 * Connects to Binance's live trade streams for BTCUSDT and ETHUSDT.
 * Parses incoming trade data and emits throttled price updates via Socket.io.
 *
 * Binance trade message format:
 * {
 *   "e": "trade",       // Event type
 *   "s": "BTCUSDT",     // Symbol
 *   "p": "67123.45",    // Price (string)
 *   "q": "0.001",       // Quantity (string)
 *   "T": 1625000000000  // Trade time (ms)
 * }
 */

const BINANCE_WS_URL =
  "wss://stream.binance.com:9443/ws/btcusdt@trade/ethusdt@trade/bnbusdt@trade/solusdt@trade";

// In-memory price store for latest prices (crypto + stocks)
const latestPrices = {
  BTCUSDT: { price: 0, timestamp: 0, volume24h: 0 },
  ETHUSDT: { price: 0, timestamp: 0, volume24h: 0 },
  BNBUSDT: { price: 0, timestamp: 0, volume24h: 0 },
  SOLUSDT: { price: 0, timestamp: 0, volume24h: 0 },
  AAPL: { price: 185.50, timestamp: 0, volume24h: 0 },
  MSFT: { price: 415.20, timestamp: 0, volume24h: 0 },
  GOOGL: { price: 172.30, timestamp: 0, volume24h: 0 },
  AMZN: { price: 180.10, timestamp: 0, volume24h: 0 },
  TSLA: { price: 175.40, timestamp: 0, volume24h: 0 },
  NVDA: { price: 920.80, timestamp: 0, volume24h: 0 },
  META: { price: 495.60, timestamp: 0, volume24h: 0 },
  NFLX: { price: 610.15, timestamp: 0, volume24h: 0 },
  AMD: { price: 160.20, timestamp: 0, volume24h: 0 },
  PLTR: { price: 22.45, timestamp: 0, volume24h: 0 },
  COIN: { price: 200.15, timestamp: 0, volume24h: 0 },
  RELIANCE: { price: 2900.50, timestamp: 0, volume24h: 0 },
  TCS: { price: 3800.20, timestamp: 0, volume24h: 0 },
  HDFCBANK: { price: 1500.10, timestamp: 0, volume24h: 0 },
  INFY: { price: 1400.30, timestamp: 0, volume24h: 0 },
  SBIN: { price: 800.50, timestamp: 0, volume24h: 0 },
};

// Price history buffers for AI predictions (kept in memory)
const priceHistory = {
  BTCUSDT: [],
  ETHUSDT: [],
  BNBUSDT: [],
  SOLUSDT: [],
  AAPL: [],
  MSFT: [],
  GOOGL: [],
  AMZN: [],
  TSLA: [],
  NVDA: [],
  META: [],
  NFLX: [],
  AMD: [],
  PLTR: [],
  COIN: [],
  RELIANCE: [],
  TCS: [],
  HDFCBANK: [],
  INFY: [],
  SBIN: [],
};

const MAX_HISTORY_LENGTH = 200;
const THROTTLE_INTERVAL_MS = 1000; // Emit at most once per second

let ws = null;
let reconnectTimer = null;
let throttleTimer = null;
let pendingEmit = false;

/**
 * Pre-populate history with random-walk data to make charts and AI work immediately.
 */
function prefillHistory(symbol, basePrice) {
  let currentPrice = basePrice;
  let timestamp = Date.now() - 150 * 1000; // 150 seconds ago
  const history = [];
  for (let i = 0; i < 150; i++) {
    const change = (Math.random() - 0.5) * 0.005; // max 0.25% change per step for visible candles
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

// Pre-fill history on startup
function prefillAllHistory() {
  prefillHistory("BTCUSDT", 67500);
  prefillHistory("ETHUSDT", 3450);
  prefillHistory("BNBUSDT", 600.50);
  prefillHistory("SOLUSDT", 150.25);
  prefillHistory("AAPL", 185.50);
  prefillHistory("MSFT", 415.20);
  prefillHistory("GOOGL", 172.30);
  prefillHistory("AMZN", 180.10);
  prefillHistory("TSLA", 175.40);
  prefillHistory("NVDA", 920.80);
  prefillHistory("META", 495.60);
  prefillHistory("NFLX", 610.15);
  prefillHistory("AMD", 160.20);
  prefillHistory("PLTR", 22.45);
  prefillHistory("COIN", 200.15);
  prefillHistory("RELIANCE", 2900.50);
  prefillHistory("TCS", 3800.20);
  prefillHistory("HDFCBANK", 1500.10);
  prefillHistory("INFY", 1400.30);
  prefillHistory("SBIN", 800.50);
}

prefillAllHistory();

/**
 * Get the latest cached prices (for use by other modules).
 */
export function getLatestPrices() {
  return { ...latestPrices };
}

/**
 * Get the price history buffer for a symbol.
 * @param {string} symbol - e.g. "BTCUSDT"
 * @param {number} count - Number of recent prices to return
 */
export function getPriceHistory(symbol, count = 50) {
  const history = priceHistory[symbol] || [];
  return history.slice(-count);
}

/**
 * Scan active user portfolios for crossed Stop-Loss / Take-Profit targets and liquidate.
 */
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

          // Notify client of the liquidation event
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

        // Push full portfolio update to client
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

/**
 * Initialize the Binance WebSocket connection and wire it to Socket.io.
 * @param {import("socket.io").Server} io - Socket.io server instance
 */
export function initBinanceSocket(io) {
  function triggerEmit() {
    if (!pendingEmit) {
      pendingEmit = true;
      throttleTimer = setTimeout(() => {
        io.emit("market_update", {
          prices: { ...latestPrices },
          timestamp: Date.now(),
        });
        pendingEmit = false;
        // Run SL/TP targets scan
        checkSLTP(io);
      }, THROTTLE_INTERVAL_MS);
    }
  }

  function connect() {
    console.log("[BinanceWS] Connecting to Binance trade stream...");

    ws = new WebSocket(BINANCE_WS_URL);

    ws.on("open", () => {
      console.log("[BinanceWS] ✅ Connected to Binance WebSocket");
      console.log("[BinanceWS] Streaming: BTCUSDT, ETHUSDT");
    });

    ws.on("message", (data) => {
      try {
        const trade = JSON.parse(data.toString());

        // Validate it's a trade event
        if (trade.e !== "trade") return;

        const symbol = trade.s; // e.g. "BTCUSDT"
        const price = parseFloat(trade.p);
        const quantity = parseFloat(trade.q);
        const timestamp = trade.T;

        if (!latestPrices[symbol]) return;

        // Update latest price
        latestPrices[symbol] = {
          price,
          timestamp,
          volume24h: latestPrices[symbol].volume24h + quantity,
        };

        // Append to price history
        priceHistory[symbol].push({
          price,
          timestamp,
          volume: quantity,
        });

        // Trim history buffer
        if (priceHistory[symbol].length > MAX_HISTORY_LENGTH) {
          priceHistory[symbol] = priceHistory[symbol].slice(-MAX_HISTORY_LENGTH);
        }

        // Trigger emit
        triggerEmit();
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
      clearTimeout(throttleTimer);
      pendingEmit = false;

      // Auto-reconnect with backoff
      reconnectTimer = setTimeout(connect, 5000);
    });
  }

  // Start the connection
  connect();

  // Stock simulator timer
  const stockSimulatorTimer = setInterval(() => {
    const stockSymbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX", "AMD", "PLTR", "COIN", "RELIANCE", "TCS", "HDFCBANK", "INFY", "SBIN"];
    const timestamp = Date.now();

    stockSymbols.forEach((symbol) => {
      const current = latestPrices[symbol];
      const sentiment = getActiveSentiment(symbol);
      const bias = sentiment * 0.001; // sentiment bias up to 0.1%
      const change = (Math.random() - 0.5) * 0.004 + bias; // max 0.2% change per tick
      const newPrice = parseFloat((current.price * (1 + change)).toFixed(2));
      const volume = Math.floor(Math.random() * 50) + 5;

      latestPrices[symbol] = {
        price: newPrice,
        timestamp,
        volume24h: current.volume24h + volume,
      };

      priceHistory[symbol].push({
        price: newPrice,
        timestamp,
        volume,
      });

      if (priceHistory[symbol].length > MAX_HISTORY_LENGTH) {
        priceHistory[symbol] = priceHistory[symbol].slice(-MAX_HISTORY_LENGTH);
      }
    });

    // Trigger emit
    triggerEmit();
  }, 1000);

  // Expose a cleanup function
  return function cleanup() {
    console.log("[BinanceWS + StockSimulator] Shutting down...");
    clearTimeout(reconnectTimer);
    clearTimeout(throttleTimer);
    clearInterval(stockSimulatorTimer);
    if (ws) {
      ws.removeAllListeners();
      ws.close();
    }
  };
}

export default { initBinanceSocket, getLatestPrices, getPriceHistory };
