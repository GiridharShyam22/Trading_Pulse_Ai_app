import WebSocket from "ws";
import { updatePrice, FINNHUB_SYMBOLS } from "./binanceSocket.js";

/**
 * Finnhub WebSocket Service
 *
 * Connects to Finnhub's real-time WebSocket API and feeds
 * live US stock trade data into the shared price store.
 *
 * Free tier: Real-time US stock trades via WebSocket.
 * Symbols: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, NFLX, AMD, PLTR, COIN
 *
 * Finnhub trade message format:
 * {
 *   "type": "trade",
 *   "data": [
 *     { "s": "AAPL", "p": 185.50, "v": 100, "t": 1625000000000 }
 *   ]
 * }
 */


let ws = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000; // 30s max backoff

// Throttle: only process 1 update per symbol per second
const lastUpdate = {};
const THROTTLE_MS = 1000;

export function initFinnhubService() {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey || apiKey === "your_key_here") {
    console.log("[FinnhubWS] ⚠️ No FINNHUB_API_KEY set — US stocks will use simulator fallback");
    return function cleanup() {};
  }

  function connect() {
    const url = `wss://ws.finnhub.io?token=${apiKey}`;
    console.log("[FinnhubWS] Connecting to Finnhub WebSocket...");

    ws = new WebSocket(url);

    ws.on("open", () => {
      console.log("[FinnhubWS] ✅ Connected to Finnhub WebSocket");
      reconnectAttempts = 0;

      // Subscribe to all US stock symbols
      for (const symbol of FINNHUB_SYMBOLS) {
        ws.send(JSON.stringify({ type: "subscribe", symbol }));
      }
      console.log(`[FinnhubWS] Subscribed to ${FINNHUB_SYMBOLS.length} symbols`);
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type !== "trade" || !Array.isArray(msg.data)) return;

        for (const trade of msg.data) {
          const symbol = trade.s;
          const price = trade.p;
          const volume = trade.v || 1;

          // Skip unknown symbols
          if (!FINNHUB_SYMBOLS.includes(symbol)) continue;

          // Throttle: max 1 update per symbol per second
          const now = Date.now();
          if (lastUpdate[symbol] && now - lastUpdate[symbol] < THROTTLE_MS) continue;
          lastUpdate[symbol] = now;

          // Feed into shared price store
          updatePrice(symbol, price, volume);
        }
      } catch (error) {
        // Silently ignore malformed messages
      }
    });

    ws.on("error", (error) => {
      console.error("[FinnhubWS] ❌ WebSocket error:", error.message);
    });

    ws.on("close", (code, reason) => {
      console.warn(
        `[FinnhubWS] ⚠️ Connection closed (code: ${code}). Reconnecting...`
      );

      // Exponential backoff
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
      console.log(`[FinnhubWS] Retrying in ${(delay / 1000).toFixed(0)}s (attempt ${reconnectAttempts})`);
      reconnectTimer = setTimeout(connect, delay);
    });
  }

  connect();

  return function cleanup() {
    console.log("[FinnhubWS] Shutting down...");
    clearTimeout(reconnectTimer);
    if (ws) {
      // Unsubscribe from all symbols before closing
      try {
        for (const symbol of FINNHUB_SYMBOLS) {
          ws.send(JSON.stringify({ type: "unsubscribe", symbol }));
        }
      } catch {
        // Ignore errors during cleanup
      }
      ws.removeAllListeners();
      ws.close();
    }
  };
}

export default { initFinnhubService };
