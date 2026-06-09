"""
Algorithmic Trading — AI Microservice
======================================
FastAPI server providing anomaly detection and trend prediction
for live cryptocurrency price data.

Endpoints:
  POST /predict  — Accepts time-series prices, returns anomaly detection
                   and trend prediction results.
  GET  /health   — Health check.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from typing import Optional
import logging

# ── Logging setup ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── FastAPI app ──────────────────────────────────────────────────
app = FastAPI(
    title="Trading AI Engine",
    description="Anomaly detection & trend prediction for crypto markets",
    version="1.0.0",
)

# CORS — allow Node backend and React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",
        "http://localhost:5005",   # Node backend
        "http://127.0.0.1:5173",
        "https://trading-pulse-ai-app.vercel.app", # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ────────────────────────────────────
class PredictionRequest(BaseModel):
    """Input model for the /predict endpoint."""
    prices: list[float] = Field(
        ...,
        min_length=10,
        max_length=500,
        description="List of recent prices (time-series, oldest → newest)",
    )
    symbol: Optional[str] = Field(
        default="BTCUSDT",
        description="Trading pair symbol (e.g., BTCUSDT, ETHUSDT)",
    )

    @validator("prices")
    def prices_must_be_positive(cls, v):
        if any(p <= 0 for p in v):
            raise ValueError("All prices must be positive numbers")
        return v


class AnomalyDetail(BaseModel):
    """Details about the anomaly detection analysis."""
    method: str
    anomaly_score: float
    threshold_breach: bool
    z_score_latest: float
    isolation_score: float


class TrendDetail(BaseModel):
    """Details about the trend prediction analysis."""
    method: str
    short_ma: float
    long_ma: float
    ma_crossover_signal: str
    price_change_pct: float
    volatility: float
    momentum: float


class PredictionResponse(BaseModel):
    """Output model for the /predict endpoint."""
    anomaly_detected: bool
    trend_prediction: str  # "bullish" | "bearish" | "neutral"
    confidence: float
    details: dict
    summary: str


# ── Core Analysis Functions ──────────────────────────────────────

def detect_anomaly(prices: list[float]) -> dict:
    """
    Detect anomalies in price data using a dual approach:
      1. Isolation Forest (unsupervised ML)
      2. Z-Score statistical method

    Returns anomaly detection results with scoring.
    """
    arr = np.array(prices)
    n = len(arr)

    # ── Feature Engineering ──────────────────────────────────
    # Create rolling features for Isolation Forest
    df = pd.DataFrame({"price": arr})

    # Rolling statistics (window = min(20, n//2))
    window = min(20, max(3, n // 2))
    df["rolling_mean"] = df["price"].rolling(window=window, min_periods=1).mean()
    df["rolling_std"] = df["price"].rolling(window=window, min_periods=1).std().fillna(0)
    df["returns"] = df["price"].pct_change().fillna(0)
    df["rolling_vol"] = df["returns"].rolling(window=window, min_periods=1).std().fillna(0)

    # Price deviation from rolling mean
    df["deviation"] = (df["price"] - df["rolling_mean"]) / df["rolling_std"].replace(0, 1)

    # ── Isolation Forest ─────────────────────────────────────
    features = df[["price", "returns", "rolling_vol", "deviation"]].fillna(0).values

    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.1,  # Expect ~10% anomalies
        random_state=42,
    )
    iso_forest.fit(features)

    # Score the latest point (-1 = anomaly, 1 = normal)
    latest_features = features[-1:].reshape(1, -1)
    iso_prediction = iso_forest.predict(latest_features)[0]
    iso_score = iso_forest.score_samples(latest_features)[0]

    # ── Z-Score Method ───────────────────────────────────────
    mean_price = np.mean(arr)
    std_price = np.std(arr)
    z_score = (arr[-1] - mean_price) / std_price if std_price > 0 else 0.0

    # Anomaly if Z-score > 2.5 OR Isolation Forest flags it
    z_score_anomaly = bool(abs(z_score) > 2.5)
    iso_anomaly = bool(iso_prediction == -1)

    # Combined decision: anomaly if EITHER method flags it
    anomaly_detected = bool(z_score_anomaly or iso_anomaly)

    # Confidence: weighted combination of both scores
    z_confidence = min(float(abs(z_score)) / 4.0, 1.0)  # Normalize z-score to 0-1
    iso_confidence = max(0.0, float(-iso_score))  # Higher negative = more anomalous
    combined_confidence = 0.4 * z_confidence + 0.6 * min(iso_confidence * 2, 1.0)

    return {
        "anomaly_detected": anomaly_detected,
        "confidence": round(float(combined_confidence), 4),
        "details": {
            "method": "Isolation Forest + Z-Score",
            "anomaly_score": round(float(iso_score), 6),
            "threshold_breach": z_score_anomaly,
            "z_score_latest": round(float(z_score), 4),
            "isolation_score": round(float(iso_score), 6),
            "isolation_flag": iso_anomaly,
        },
    }


def predict_trend(prices: list[float]) -> dict:
    """
    Predict market trend using Moving Average Crossover strategy:
      - Short MA (5-period) vs Long MA (20-period)
      - Momentum analysis
      - Volatility assessment

    Returns trend prediction with confidence and details.
    """
    arr = np.array(prices)
    n = len(arr)

    # ── Moving Averages ──────────────────────────────────────
    short_window = min(5, n)
    long_window = min(20, n)

    short_ma = float(np.mean(arr[-short_window:]))
    long_ma = float(np.mean(arr[-long_window:]))

    # MA crossover signal
    if short_ma > long_ma * 1.001:  # 0.1% threshold to avoid noise
        ma_signal = "bullish"
    elif short_ma < long_ma * 0.999:
        ma_signal = "bearish"
    else:
        ma_signal = "neutral"

    # ── Price Change ─────────────────────────────────────────
    lookback = min(10, n)
    price_change_pct = ((arr[-1] - arr[-lookback]) / arr[-lookback]) * 100

    # ── Momentum (Rate of Change) ────────────────────────────
    returns = np.diff(arr) / arr[:-1] if n > 1 else np.array([0])
    recent_returns = returns[-min(5, len(returns)):]
    momentum = float(np.mean(recent_returns)) * 100  # As percentage

    # ── Volatility ───────────────────────────────────────────
    volatility = float(np.std(returns)) * 100 if len(returns) > 1 else 0.0

    # ── Final Prediction ─────────────────────────────────────
    # Weighted scoring: MA signal + momentum + price change
    bullish_signals = 0
    bearish_signals = 0
    total_signals = 3

    # Signal 1: MA Crossover
    if ma_signal == "bullish":
        bullish_signals += 1
    elif ma_signal == "bearish":
        bearish_signals += 1

    # Signal 2: Momentum
    if momentum > 0.05:
        bullish_signals += 1
    elif momentum < -0.05:
        bearish_signals += 1

    # Signal 3: Recent price direction
    if price_change_pct > 0.1:
        bullish_signals += 1
    elif price_change_pct < -0.1:
        bearish_signals += 1

    # Determine final trend
    if bullish_signals > bearish_signals:
        trend = "bullish"
        confidence = bullish_signals / total_signals
    elif bearish_signals > bullish_signals:
        trend = "bearish"
        confidence = bearish_signals / total_signals
    else:
        trend = "neutral"
        confidence = 0.5

    return {
        "trend_prediction": trend,
        "confidence": round(float(confidence), 4),
        "details": {
            "method": "MA Crossover + Momentum",
            "short_ma": round(short_ma, 2),
            "long_ma": round(long_ma, 2),
            "ma_crossover_signal": ma_signal,
            "price_change_pct": round(float(price_change_pct), 4),
            "volatility": round(float(volatility), 6),
            "momentum": round(float(momentum), 6),
        },
    }


# ── API Endpoints ────────────────────────────────────────────────

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Analyze time-series price data for anomalies and trend prediction.

    Accepts a list of recent prices (minimum 10 data points) and returns:
    - Whether an anomaly was detected in the latest price action
    - A trend prediction (bullish / bearish / neutral)
    - Confidence scores and detailed analysis metrics
    """
    try:
        prices = request.prices
        symbol = request.symbol or "UNKNOWN"

        logger.info(
            f"[Predict] Analyzing {len(prices)} prices for {symbol} "
            f"(range: ${min(prices):.2f} — ${max(prices):.2f})"
        )

        # Run both analyses
        anomaly_result = detect_anomaly(prices)
        trend_result = predict_trend(prices)

        # Combined confidence (average of both)
        combined_confidence = (
            anomaly_result["confidence"] + trend_result["confidence"]
        ) / 2

        # Build summary string
        anomaly_status = "⚠️ ANOMALY DETECTED" if anomaly_result["anomaly_detected"] else "✅ Normal"
        trend_emoji = {
            "bullish": "📈",
            "bearish": "📉",
            "neutral": "➡️",
        }.get(trend_result["trend_prediction"], "")

        summary = (
            f"{symbol}: {anomaly_status} | "
            f"Trend: {trend_emoji} {trend_result['trend_prediction'].upper()} | "
            f"Confidence: {combined_confidence:.0%}"
        )

        logger.info(f"[Predict] Result: {summary}")

        return PredictionResponse(
            anomaly_detected=anomaly_result["anomaly_detected"],
            trend_prediction=trend_result["trend_prediction"],
            confidence=round(combined_confidence, 4),
            details={
                "anomaly": anomaly_result["details"],
                "trend": trend_result["details"],
                "data_points": len(prices),
                "latest_price": prices[-1],
                "price_range": {
                    "min": min(prices),
                    "max": max(prices),
                },
            },
            summary=summary,
        )

    except ValueError as e:
        logger.error(f"[Predict] Validation error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"[Predict] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal prediction error")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "Trading AI Engine",
        "version": "1.0.0",
    }


# ── Startup / Shutdown Events ────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    logger.info("=" * 55)
    logger.info("  🧠 Trading AI Engine")
    logger.info("  📡 Server:  http://localhost:8000")
    logger.info("  📚 Docs:    http://localhost:8000/docs")
    logger.info("=" * 55)


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("[AI Engine] Shutting down...")
