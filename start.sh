#!/bin/bash

# ═══════════════════════════════════════════════════════════
#  TradingPulse — Start All Services
#  Usage:  ./start.sh
# ═══════════════════════════════════════════════════════════

DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚀 TradingPulse — Starting All Services${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# ── Kill any leftover processes on our ports ─────────────
echo -e "${YELLOW}[0/4]${NC} Clearing ports 8000, 5005, 5173..."
lsof -ti :5005 -ti :8000 -ti :5173 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1
echo -e "${GREEN}  ✅ Ports cleared${NC}"

# ── Check MongoDB ────────────────────────────────────────
echo -e "${YELLOW}[1/4]${NC} Checking MongoDB..."
if nc -zv 127.0.0.1 27017 2>/dev/null; then
  echo -e "${GREEN}  ✅ MongoDB is running${NC}"
else
  echo -e "${RED}  ❌ MongoDB is NOT running!${NC}"
  echo -e "${YELLOW}  Start it with: brew services start mongodb-community${NC}"
  echo -e "${YELLOW}  Or:            mongod${NC}"
  exit 1
fi

# ── Start AI Engine ──────────────────────────────────────
echo -e "${YELLOW}[2/4]${NC} Starting AI Engine (port 8000)..."
cd "$DIR/ai-engine"
./venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 &
PID_AI=$!
echo -e "${GREEN}  ✅ AI Engine started (PID: $PID_AI)${NC}"

# ── Start Backend ────────────────────────────────────────
echo -e "${YELLOW}[3/4]${NC} Starting Backend (port 5005)..."
cd "$DIR/backend"
npm run dev &
PID_BACKEND=$!
echo -e "${GREEN}  ✅ Backend started (PID: $PID_BACKEND)${NC}"

# ── Start Frontend ───────────────────────────────────────
echo -e "${YELLOW}[4/4]${NC} Starting Frontend (port 5173)..."
cd "$DIR/frontend"
npm run dev &
PID_FRONTEND=$!
echo -e "${GREEN}  ✅ Frontend started (PID: $PID_FRONTEND)${NC}"

# ── Summary ──────────────────────────────────────────────
sleep 2
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ All services running!${NC}"
echo ""
echo -e "  🧠 AI Engine:  ${BLUE}http://127.0.0.1:8000${NC}"
echo -e "  📡 Backend:    ${BLUE}http://localhost:5005${NC}"
echo -e "  🖥️  Frontend:   ${BLUE}http://localhost:5173${NC}"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# ── Graceful shutdown on Ctrl+C ──────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down all services...${NC}"
  kill $PID_AI $PID_BACKEND $PID_FRONTEND 2>/dev/null
  wait $PID_AI $PID_BACKEND $PID_FRONTEND 2>/dev/null
  echo -e "${GREEN}All services stopped. Goodbye!${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for all background processes
wait
