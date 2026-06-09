// Simulates financial news events and tracks asset sentiment.
import { ALL_SYMBOLS } from "./binanceSocket.js";

const NEWS_TEMPLATES = {
  positive: [
    "{name} announces record earnings, beating analyst projections by {percent}%.",
    "{name} launches breakthrough product line, sparking intense market demand.",
    "Analyst upgrade drives institutional volume for {name} with a high target price.",
    "Strategic partnership secured by {name} to expand global market footprint.",
    "Regulatory approval granted to {name}, clearing pathway for international expansion.",
  ],
  negative: [
    "{name} faces regulatory investigation over market antitrust concerns.",
    "Earnings report for {name} misses targets by {percent}%, prompting retail sell-off.",
    "Supply chain bottlenecks hit manufacturing schedules for {name}.",
    "Key executive departs from {name}, raising corporate leadership questions.",
    "Security breach detected at {name}, exposing internal infrastructure.",
  ],
  neutral: [
    "{name} hosts annual shareholder meeting, outlines long-term strategy.",
    "Industry conference sees participation from {name} leadership.",
    "No immediate price drivers reported for {name} amid stable volume.",
    "{name} settles routine intellectual property dispute amicably.",
    "General market stability keeps trading range for {name} within bounds.",
  ],
};

const headlinesBuffer = [];
const activeSentiment = {}; // symbol -> { score: -1 | 0 | 1, expiresAt: timestamp }

export function getActiveSentiment(symbol) {
  const current = activeSentiment[symbol];
  if (!current || Date.now() > current.expiresAt) {
    return 0; // Neutral fallback if expired
  }
  return current.score;
}

export function getRecentNews() {
  return [...headlinesBuffer];
}

export function initNewsService(io) {
  function generateNewsFlash() {
    const symbol = ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)];
    const ticker = symbol.replace('USDT', '');
    const name = ticker; // Fallback to ticker name
    
    // Choose sentiment
    const r = Math.random();
    const sentiment = r < 0.4 ? "positive" : r < 0.8 ? "negative" : "neutral";
    const templates = NEWS_TEMPLATES[sentiment];
    let headline = templates[Math.floor(Math.random() * templates.length)];

    // Fill templates variables
    const percent = (Math.random() * 15 + 2).toFixed(1);
    headline = headline.replace(/{name}/g, name).replace(/{percent}/g, percent);

    const score = sentiment === "positive" ? 1.0 : sentiment === "negative" ? -1.0 : 0.0;
    
    // Sentiment active for 25 to 50 seconds
    const durationMs = (Math.floor(Math.random() * 25) + 25) * 1000;
    activeSentiment[symbol] = {
      score,
      expiresAt: Date.now() + durationMs,
    };

    const newsItem = {
      id: Math.random().toString(36).substr(2, 9),
      symbol,
      ticker,
      headline,
      sentiment,
      timestamp: Date.now(),
      expiresAt: Date.now() + durationMs,
    };

    headlinesBuffer.unshift(newsItem);
    if (headlinesBuffer.length > 50) {
      headlinesBuffer.pop();
    }

    console.log(`[NewsFlash] [${sentiment.toUpperCase()}] ${headline}`);
    io.emit("news_flash", newsItem);
  }

  // Generate initial news items
  for (let i = 0; i < 5; i++) {
    generateNewsFlash();
  }

  // Periodically generate news flash every 45 seconds
  const newsTimer = setInterval(generateNewsFlash, 45000);

  return function cleanup() {
    clearInterval(newsTimer);
  };
}

export default { initNewsService, getActiveSentiment, getRecentNews };
