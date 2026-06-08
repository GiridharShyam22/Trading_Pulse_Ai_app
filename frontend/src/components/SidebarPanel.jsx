import { useState, useMemo } from 'react';
import axios from 'axios';
import {
  ShoppingCart,
  Brain,
  ArrowUp,
  ArrowDown,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  Activity,
  BarChart2,
  Zap,
  Briefcase,
  Newspaper,
  TrendingUp as TrendUpIcon,
} from 'lucide-react';
import { ASSETS } from '../App';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';

const API = 'https://trading-pulse-backend.onrender.com';

/* ── Reusable stat row ───────────────────────────────────────── */
function StatRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.03em' }}>{label}</span>
      <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: valueColor || 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

/* ── Confidence bar ─────────────────────────────────────────── */
function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 66 ? 'var(--accent-green)' : pct >= 40 ? 'var(--accent-amber)' : 'var(--accent-red)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI Confidence</span>
        <span className="mono" style={{ fontSize: '13px', fontWeight: 800, color }}>{pct}%</span>
      </div>
      <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: '99px',
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition: 'width 0.6s ease',
          boxShadow: `0 0 10px ${color}66`,
        }} />
      </div>
    </div>
  );
}

export default function SidebarPanel({
  userId,
  activeAsset = 'BTCUSDT',
  currentPrices = {},
  balance = 0,
  portfolio = {},
  transactions = [],
  equityHistory = [],
  news = [],
  liquidationAlert = null,
  setLiquidationAlert,
  onTradeComplete,
  aiPrediction = null,
  aiLoading = false,
  aiConnected = false,
  aiLastUpdated = null,
  fundRequested = false,
  setFundRequested,
  authToken,
}) {
  const [tab, setTab] = useState('trade');
  const [qty, setQty] = useState('');
  const [stopLossVal, setStopLossVal] = useState('');
  const [takeProfitVal, setTakeProfitVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const price = currentPrices[activeAsset]?.price || 0;
  const total = (parseFloat(qty) || 0) * price;
  const coin = activeAsset.replace('USDT', '');

  /* ── Execute Trade ───────────────────────────────────────── */
  const trade = async (side) => {
    const q = parseFloat(qty);
    if (!q || q <= 0) return setMsg({ ok: false, text: 'Enter a valid quantity' });
    if (!price) return setMsg({ ok: false, text: 'Waiting for live price…' });
    setBusy(true);
    setMsg(null);
    try {
      const payload = {
        userId,
        symbol: activeAsset,
        type: side,
        quantity: q,
        price,
      };

      if (side === 'buy') {
        if (stopLossVal) payload.stopLoss = parseFloat(stopLossVal);
        if (takeProfitVal) payload.takeProfit = parseFloat(takeProfitVal);
      }

      const r = await axios.post(`${API}/api/trade/execute`, payload);
      if (r.data.success) {
        const t = r.data.data.transaction;
        const formattedPrice = t.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setMsg({
          ok: true,
          text: `${side === 'buy' ? 'Bought' : 'Sold'} ${t.quantity} ${coin} @ ₹${formattedPrice}`,
        });
        setQty('');
        setStopLossVal('');
        setTakeProfitVal('');
        onTradeComplete?.(r.data.data);
      }
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'Trade failed' });
    }
    setBusy(false);
  };

  /* ── Request Additional Funds ────────────────────────────── */
  const requestFunds = async () => {
    if (fundRequested || !authToken) return;
    setBusy(true);
    try {
      const r = await axios.post(`${API}/api/user/request-funds`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (r.data.success) {
        setFundRequested(true);
        setMsg({ ok: true, text: 'Fund request submitted successfully.' });
        setTimeout(() => setMsg(null), 3000);
      }
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'Failed to request funds' });
      setTimeout(() => setMsg(null), 3000);
    }
    setBusy(false);
  };

  const pct = (frac) => {
    if (price <= 0) return;
    setQty(((balance * frac) / price).toFixed(6));
  };

  /* ── AI data ─────────────────────────────────────────────── */
  const anomaly = aiPrediction?.anomaly_detected === true;
  const trend = aiPrediction?.trend_prediction || 'neutral';
  const confidence = aiPrediction?.confidence || 0;
  const td = aiPrediction?.details?.trend || {};
  const ad = aiPrediction?.details?.anomaly || {};

  const trendCfg = {
    bullish: { Icon: TrendingUp, label: 'Bullish', color: 'var(--accent-green)', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.2)' },
    bearish: { Icon: TrendingDown, label: 'Bearish', color: 'var(--accent-red)', bg: 'rgba(190,18,60,0.08)', border: 'rgba(190,18,60,0.2)' },
    neutral: { Icon: Minus, label: 'Neutral', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  };
  const tCfg = trendCfg[trend] || trendCfg.neutral;

  /* ── Portfolio Analytics & Equity Curve Data ────────────── */
  const activePositions = Object.entries(portfolio).filter(
    ([_, pos]) => pos.quantity > 0.00000001
  );

  const equityData = useMemo(() => {
    if (equityHistory.length === 0) {
      return [{ name: 'Start', equity: 100000 }];
    }
    return equityHistory.map((item, idx) => ({
      name: idx === 0 ? 'Start' : '',
      equity: item.equity,
      time: item.timestamp
        ? new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        : `T${idx}`
    }));
  }, [equityHistory]);

  const winRate = useMemo(() => {
    const sells = transactions.filter(t => t.type === 'sell');
    if (sells.length === 0) return '—';
    let wins = 0;
    sells.forEach(s => {
      // Find the closest preceding buy order for the same symbol
      const buys = transactions.filter(t =>
        t.type === 'buy' &&
        t.symbol === s.symbol &&
        new Date(t.createdAt || t.timestamp) < new Date(s.createdAt || s.timestamp)
      );
      if (buys.length > 0) {
        if (s.price > buys[0].price) wins++;
      } else {
        wins++; // default to win if trade history is truncated
      }
    });
    return `${Math.round((wins / sells.length) * 100)}%`;
  }, [transactions]);

  const totalReturn = useMemo(() => {
    const currentEquity = equityHistory.length > 0
      ? equityHistory[equityHistory.length - 1].equity
      : balance + activePositions.reduce((sum, [sym, pos]) => sum + pos.quantity * (currentPrices[sym]?.price || pos.avgPrice), 0);
    const retVal = ((currentEquity - 100000) / 100000) * 100;
    return `${retVal >= 0 ? '+' : ''}${retVal.toFixed(2)}%`;
  }, [equityHistory, balance, activePositions, currentPrices]);

  const maxDrawdown = useMemo(() => {
    if (equityHistory.length === 0) return '0.00%';
    let peak = 100000;
    let maxDd = 0;
    equityHistory.forEach(pt => {
      if (pt.equity > peak) peak = pt.equity;
      const dd = ((peak - pt.equity) / peak) * 100;
      if (dd > maxDd) maxDd = dd;
    });
    return `${maxDd.toFixed(2)}%`;
  }, [equityHistory]);

  const panelStyle = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '16px',
    background: 'var(--bg-panel)',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 20px 40px -10px rgba(0,0,0,0.6)',
    overflow: 'hidden',
  };

  return (
    <div style={panelStyle}>

      {/* ═══ TAB BAR ════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        background: 'rgba(0,0,0,0.2)',
      }}>
        {[
          { id: 'trade', Icon: ShoppingCart, label: 'Execute' },
          { id: 'ai', Icon: Brain, label: 'AI Insights' },
          { id: 'portfolio', Icon: Briefcase, label: 'Portfolio' },
        ].map(({ id, Icon, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '16px 4px',
                background: active ? 'rgba(59,130,246,0.07)' : 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
                color: active ? '#f1f5f9' : 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ═══ CONTENT ════════════════════════════════════════════ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {tab === 'trade' && (
          /* ═══════════ ORDER EXECUTION ════════════════════════ */
          <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Liquidation Banner Alert */}
            {liquidationAlert && (
              <div className="enter" style={{
                padding: '12px 14px', borderRadius: '10px',
                border: '1px solid rgba(245,158,11,0.3)',
                background: 'rgba(245,158,11,0.07)',
                color: 'var(--accent-amber)',
                display: 'flex', flexDirection: 'column', gap: '4px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em' }}>⚠️ LIQUIDATION TRIGGERED</span>
                  <button
                    onClick={() => setLiquidationAlert(null)}
                    style={{ border: 'none', background: 'transparent', color: 'var(--accent-amber)', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}
                  >
                    ✕
                  </button>
                </div>
                <span style={{ fontSize: '11px', lineHeight: 1.4 }}>
                  Your {liquidationAlert.quantity} {liquidationAlert.symbol.replace('USDT', '')} position was closed automatically via {liquidationAlert.type === 'stopLoss' ? 'Stop-Loss' : 'Take-Profit'} at <strong>₹{liquidationAlert.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>.
                </span>
              </div>
            )}

            {/* Current Price */}
            <div style={{
              padding: '16px 18px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Live Market Price · {coin} / {ASSETS[activeAsset]?.base || 'USD'}
              </div>
              {price > 0 ? (
                <div className="mono" style={{ fontSize: '32px', fontWeight: 800, color: 'white', letterSpacing: '-1px', lineHeight: 1 }}>
                  ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              ) : (
                <div className="skel" style={{ height: '36px', width: '200px', borderRadius: '8px' }} />
              )}
            </div>

            {/* Quantity Input */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Quantity ({coin})
              </label>
              <input
                id="trade-qty"
                type="number"
                step="any"
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0.000000"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '-0.5px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(59,130,246,0.5)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.09)';
                  e.target.style.boxShadow = 'none';
                }}
              />

              {/* Quick % buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginTop: '10px' }}>
                {[10, 25, 50, 100].map((p) => (
                  <button
                    key={p}
                    onClick={() => pct(p / 100)}
                    style={{
                      padding: '8px 0',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    onMouseEnter={e => { e.target.style.background = 'rgba(59,130,246,0.1)'; e.target.style.color = '#3b82f6'; e.target.style.borderColor = 'rgba(59,130,246,0.3)'; }}
                    onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.color = 'var(--text-muted)'; e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {/* Stop-Loss / Take-Profit Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Stop-Loss Price (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={stopLossVal}
                  onChange={(e) => setStopLossVal(e.target.value)}
                  placeholder="SL Target"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)',
                    color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'JetBrains Mono, monospace'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Take-Profit Price (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={takeProfitVal}
                  onChange={(e) => setTakeProfitVal(e.target.value)}
                  placeholder="TP Target"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)',
                    color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'JetBrains Mono, monospace'
                  }}
                />
              </div>
            </div>

            {/* Total */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Est. Total</span>
              <span className="mono" style={{ fontSize: '20px', fontWeight: 800, color: total > 0 ? 'white' : 'var(--text-faint)', letterSpacing: '-0.5px' }}>
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Buy / Sell */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                id="btn-buy"
                onClick={() => trade('buy')}
                disabled={busy}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(5,150,105,0.3)',
                  background: 'linear-gradient(135deg, rgba(5,150,105,0.15), rgba(5,150,105,0.08))',
                  color: 'var(--accent-green)',
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.5 : 1,
                  transition: 'all 0.15s',
                  boxShadow: '0 0 20px rgba(5,150,105,0.1)',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(5,150,105,0.25), rgba(5,150,105,0.15))'; e.currentTarget.style.boxShadow = '0 0 30px rgba(5,150,105,0.2)'; } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(5,150,105,0.15), rgba(5,150,105,0.08))'; e.currentTarget.style.boxShadow = '0 0 20px rgba(5,150,105,0.1)'; }}
              >
                {busy ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowUp size={16} />}
                Buy {coin}
              </button>
              <button
                id="btn-sell"
                onClick={() => trade('sell')}
                disabled={busy}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(190,18,60,0.3)',
                  background: 'linear-gradient(135deg, rgba(190,18,60,0.15), rgba(190,18,60,0.08))',
                  color: 'var(--accent-red)',
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.5 : 1,
                  transition: 'all 0.15s',
                  boxShadow: '0 0 20px rgba(190,18,60,0.1)',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(190,18,60,0.25), rgba(190,18,60,0.15))'; e.currentTarget.style.boxShadow = '0 0 30px rgba(190,18,60,0.2)'; } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(190,18,60,0.15), rgba(190,18,60,0.08))'; e.currentTarget.style.boxShadow = '0 0 20px rgba(190,18,60,0.1)'; }}
              >
                {busy ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowDown size={16} />}
                Sell {coin}
              </button>
            </div>

            {/* Toast */}
            {msg && (
              <div className="enter" style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '14px 16px',
                borderRadius: '10px',
                border: msg.ok ? '1px solid rgba(5,150,105,0.25)' : '1px solid rgba(190,18,60,0.25)',
                background: msg.ok ? 'rgba(5,150,105,0.07)' : 'rgba(190,18,60,0.07)',
                color: msg.ok ? 'var(--accent-green)' : 'var(--accent-red)',
              }}>
                {msg.ok
                  ? <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                  : <XCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />}
                <span style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.4 }}>{msg.text}</span>
              </div>
            )}
          </div>
        )}

        {tab === 'ai' && (
          /* ═══════════ AI INSIGHTS & SENTIMENT FEED ════════════ */
          <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Status bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '10px',
              background: aiConnected ? 'rgba(5,150,105,0.06)' : 'rgba(190,18,60,0.06)',
              border: aiConnected ? '1px solid rgba(5,150,105,0.15)' : '1px solid rgba(190,18,60,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className={aiConnected ? 'beacon' : ''}
                  style={{ width: '7px', height: '7px', borderRadius: '50%', background: aiConnected ? 'var(--accent-green)' : 'var(--accent-red)', display: 'inline-block' }}
                />
                <span style={{ fontSize: '11px', fontWeight: 700, color: aiConnected ? 'var(--accent-green)' : 'var(--accent-red)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {aiConnected ? 'Engine Online' : 'Engine Offline'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {aiLoading && <Loader2 size={14} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />}
                {aiLastUpdated && (
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {new Date(aiLastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                  </span>
                )}
              </div>
            </div>

            {/* Waiting state */}
            {!aiPrediction && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', textAlign: 'center', gap: '12px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '16px',
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '8px',
                }}>
                  <Activity size={28} color="#3b82f6" style={{ opacity: 0.7 }} />
                </div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Awaiting Data</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '240px' }}>
                  The AI engine is generating insights from price history buffers. Live data is streaming…
                </p>
              </div>
            )}

            {/* Prediction results */}
            {aiPrediction && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* Anomaly card */}
                {anomaly ? (
                  <div className="anomaly-glow" style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(190,18,60,0.08)',
                    border: '1px solid rgba(190,18,60,0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'var(--accent-red)', borderRadius: '3px 0 0 3px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <AlertTriangle size={20} color="var(--accent-red)" />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-red)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Anomaly Detected</span>
                    </div>
                    <div style={{ paddingLeft: '30px', display: 'flex', gap: '20px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'rgba(190,18,60,0.6)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Z-Score</div>
                        <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-red)' }}>{ad.z_score_latest?.toFixed(3)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'rgba(190,18,60,0.6)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Isolation</div>
                        <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-red)' }}>{ad.isolation_score?.toFixed(4)}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'rgba(5,150,105,0.06)',
                    border: '1px solid rgba(5,150,105,0.2)',
                  }}>
                    <ShieldCheck size={20} color="var(--accent-green)" />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Market Nominal</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Price action within expected bounds</div>
                    </div>
                  </div>
                )}

                {/* Trend + Confidence */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: tCfg.bg,
                    border: `1px solid ${tCfg.border}`,
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: `${tCfg.color}99`, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Trend</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <tCfg.Icon size={22} color={tCfg.color} />
                      <span style={{ fontSize: '16px', fontWeight: 800, color: tCfg.color }}>{tCfg.label}</span>
                    </div>
                  </div>
                  <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(59,130,246,0.07)',
                    border: '1px solid rgba(59,130,246,0.2)',
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(59,130,246,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Signal</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={18} color="#3b82f6" />
                      <span className="mono" style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6' }}>
                        {Math.round(confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confidence bar */}
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <ConfidenceBar value={confidence} />
                </div>

                {/* Breakdown */}
                <div style={{
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <BarChart2 size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Algorithmic Breakdown
                    </span>
                  </div>
                  <div style={{ padding: '4px 16px 8px' }}>
                    <StatRow label="Short MA (5)" value={td.short_ma ? `₹${td.short_ma.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'} />
                    <StatRow label="Long MA (20)" value={td.long_ma ? `₹${td.long_ma.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'} />
                    <StatRow
                      label="MA Signal"
                      value={td.ma_crossover_signal?.toUpperCase() || '—'}
                      valueColor={
                        td.ma_crossover_signal === 'bullish' ? 'var(--accent-green)' :
                          td.ma_crossover_signal === 'bearish' ? 'var(--accent-red)' : 'var(--accent-amber)'
                      }
                    />
                    <StatRow
                      label="Momentum"
                      value={td.momentum != null ? `${td.momentum.toFixed(4)}%` : '—'}
                      valueColor={(td.momentum || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
                    />
                    <StatRow label="Volatility" value={td.volatility != null ? `${td.volatility.toFixed(4)}%` : '—'} />
                  </div>
                </div>
              </div>
            )}

            {/* News Sentiment Feed Divider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '10px 0 2px' }} />

            {/* Market News Feed Widget */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Newspaper size={14} color="var(--text-muted)" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Live Sentiment News Feed
                </span>
              </div>

              {news.length === 0 ? (
                <div style={{
                  padding: '16px', borderRadius: '10px', textAlign: 'center',
                  background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)',
                  color: 'var(--text-muted)', fontSize: '12px'
                }}>
                  Connecting to global news channel…
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                  {news.slice(0, 15).map((item) => {
                    const isPos = item.sentiment === 'positive';
                    const isNeg = item.sentiment === 'negative';
                    const badgeColor = isPos ? 'var(--accent-green)' : isNeg ? 'var(--accent-red)' : '#64748b';
                    const badgeBg = isPos ? 'rgba(5,150,105,0.08)' : isNeg ? 'rgba(190,18,60,0.08)' : 'rgba(100,116,139,0.08)';
                    const badgeText = isPos ? 'BULLISH' : isNeg ? 'BEARISH' : 'NEUTRAL';

                    return (
                      <div key={item.id} style={{
                        padding: '10px 12px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        display: 'flex', flexDirection: 'column', gap: '6px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '9px', fontWeight: 800, color: badgeColor,
                            background: badgeBg, padding: '1px 5px', borderRadius: '4px',
                            letterSpacing: '0.04em'
                          }}>
                            {badgeText}
                          </span>
                          <span style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                            {item.ticker}
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', color: 'white', lineHeight: 1.4, margin: 0, fontWeight: 500 }}>
                          {item.headline}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {tab === 'portfolio' && (
          /* ═══════════ PORTFOLIO / HOLDINGS & PERFORMANCE ═════ */
          <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Performance Analytics Dashboard */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
              padding: '12px 10px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'
            }}>
              {[
                { label: 'Total Return', value: totalReturn, color: totalReturn.startsWith('+') ? 'var(--accent-green)' : totalReturn.startsWith('-') ? 'var(--accent-red)' : 'white' },
                { label: 'Win Rate', value: winRate, color: '#f59e0b' },
                { label: 'Max DD', value: maxDrawdown, color: 'var(--accent-red)' }
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    {m.label}
                  </div>
                  <div className="mono" style={{ fontSize: '14px', fontWeight: 800, color: m.color }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Request Additional Funds */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={requestFunds}
                disabled={fundRequested || busy}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  background: fundRequested ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
                  border: fundRequested ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(59,130,246,0.3)',
                  color: fundRequested ? 'var(--text-muted)' : '#3b82f6',
                  fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                  cursor: fundRequested || busy ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
                onMouseEnter={e => {
                  if (!fundRequested && !busy) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.1))';
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
                  }
                }}
                onMouseLeave={e => {
                  if (!fundRequested && !busy) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))';
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)';
                  }
                }}
              >
                {busy && !fundRequested ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {fundRequested ? 'Funds Requested (Pending Admin)' : 'Request Additional ₹1,00,000'}
              </button>
            </div>

            {/* Equity Curve Chart */}
            <div style={{
              padding: '12px', borderRadius: '12px',
              background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <TrendUpIcon size={12} color="var(--text-muted)" />
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Equity Performance Curve
                </span>
              </div>
              <div style={{ height: '80px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div style={{ background: 'rgba(8,12,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                            <span className="mono" style={{ fontSize: '11px', color: 'white', fontWeight: 700 }}>
                              ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      fill="url(#equityGrad)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Holdings Section */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Active Positions
              </div>

              {activePositions.length === 0 ? (
                <div style={{
                  padding: '24px 16px', borderRadius: '12px',
                  border: '1px dashed rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.01)',
                  textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px'
                }}>
                  No open positions.<br />Select an asset and execute trades to start.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activePositions.map(([symbol, pos]) => {
                    const assetInfo = ASSETS[symbol] || { name: symbol, prefix: '₹', color: '#888888', base: 'USD' };
                    const livePrice = currentPrices[symbol]?.price || pos.avgPrice;
                    const marketValue = pos.quantity * livePrice;
                    const costBasis = pos.quantity * pos.avgPrice;
                    const pnl = marketValue - costBasis;
                    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                    const pnlColor = pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
                    const pnlPrefix = pnl >= 0 ? '+' : '';

                    return (
                      <div key={symbol} style={{
                        padding: '12px 14px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', flexDirection: 'column', gap: '6px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '22px', height: '22px', borderRadius: '5px',
                              background: `${assetInfo.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '11px', fontWeight: 800, color: assetInfo.color
                            }}>
                              {assetInfo.prefix}
                            </div>
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>
                                {symbol.replace('USDT', '')}
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 500 }}>
                                {assetInfo.name}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {pos.stopLoss && (
                              <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--accent-red)', background: 'rgba(190,18,60,0.06)', padding: '1px 4px', borderRadius: '3px' }}>
                                SL: ₹{pos.stopLoss}
                              </span>
                            )}
                            {pos.takeProfit && (
                              <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--accent-green)', background: 'rgba(5,150,105,0.06)', padding: '1px 4px', borderRadius: '3px' }}>
                                TP: ₹{pos.takeProfit}
                              </span>
                            )}
                            <span style={{
                              fontSize: '9px', fontWeight: 800,
                              color: pnlColor,
                              background: pnl >= 0 ? 'rgba(5,150,105,0.08)' : 'rgba(190,18,60,0.08)',
                              padding: '2px 6px', borderRadius: '4px',
                              letterSpacing: '0.04em'
                            }}>
                              {pnl >= 0 ? 'PROFIT' : 'LOSS'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '6px' }}>
                          <div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>POSITION</div>
                            <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginTop: '1px' }}>
                              {pos.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} {symbol.replace('USDT', '')}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>MARKET VALUE</div>
                            <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginTop: '1px' }}>
                              ₹{marketValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>AVG COST / LIVE</div>
                            <div className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '1px' }}>
                              ₹{pos.avgPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / ₹{livePrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>UNREALIZED P&L</div>
                            <div className="mono" style={{ fontSize: '12px', fontWeight: 800, color: pnlColor, marginTop: '1px' }}>
                              {pnlPrefix}₹{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pnlPrefix}{pnlPct.toFixed(2)}%)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Transactions Activity */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Recent Transactions
              </div>

              {transactions.length === 0 ? (
                <div style={{
                  padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px',
                  border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', background: 'rgba(0,0,0,0.1)'
                }}>
                  No transaction history.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '180px', overflowY: 'auto' }}>
                  {transactions.slice(0, 10).map((tx, index) => {
                    const txTime = tx.createdAt || tx.timestamp
                      ? new Date(tx.createdAt || tx.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                      : '—';
                    const isBuy = tx.type === 'buy';

                    return (
                      <div key={tx._id || tx.id || index} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '36px', height: '18px', borderRadius: '4px',
                            fontSize: '9px', fontWeight: 800,
                            background: isBuy ? 'rgba(5,150,105,0.08)' : 'rgba(190,18,60,0.08)',
                            color: isBuy ? 'var(--accent-green)' : 'var(--accent-red)',
                            border: `1px solid ${isBuy ? 'rgba(5,150,105,0.15)' : 'rgba(190,18,60,0.15)'}`
                          }}>
                            {tx.type.toUpperCase()}
                          </span>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>
                              {tx.symbol.replace('USDT', '')}
                            </div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                              {txTime}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>
                            {tx.quantity.toLocaleString('en-IN', { maximumFractionDigits: 6 })} @ ₹{tx.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </div>
                          <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Total: ₹{tx.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}