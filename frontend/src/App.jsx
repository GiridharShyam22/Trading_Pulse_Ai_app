import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import socket from './services/socket';
import MarketChart from './components/MarketChart';
import SidebarPanel from './components/SidebarPanel';
import AuthScreen from './components/AuthScreen';
import AdminDashboard from './components/AdminDashboard';
import { Zap, Wifi, WifiOff, Wallet, TrendingUp, Search, LogOut, User, Shield, LayoutDashboard } from 'lucide-react';

const AI_URL = 'http://localhost:8000';
const BACKEND = 'http://localhost:5005';
const MAX_HIST = 50;
const AI_INTERVAL = 10;

export const ASSETS = {
  BTCUSDT: { symbol: 'BTCUSDT', name: 'Bitcoin', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' },
  ETHUSDT: { symbol: 'ETHUSDT', name: 'Ethereum', prefix: 'Ξ', type: 'Crypto', color: '#6366f1', base: 'USDT' },
  AAPL: { symbol: 'AAPL', name: 'Apple Inc.', prefix: '₹', type: 'Stock', color: '#a3a3a3', base: 'USD' },
  MSFT: { symbol: 'MSFT', name: 'Microsoft Corp.', prefix: '₹', type: 'Stock', color: '#0ea5e9', base: 'USD' },
  GOOGL: { symbol: 'GOOGL', name: 'Alphabet Inc.', prefix: '₹', type: 'Stock', color: 'var(--accent-red)', base: 'USD' },
  AMZN: { symbol: 'AMZN', name: 'Amazon.com Inc.', prefix: '₹', type: 'Stock', color: '#f97316', base: 'USD' },
  TSLA: { symbol: 'TSLA', name: 'Tesla Inc.', prefix: '₹', type: 'Stock', color: '#e11d48', base: 'USD' },
  NVDA: { symbol: 'NVDA', name: 'NVIDIA Corp.', prefix: '₹', type: 'Stock', color: '#22c55e', base: 'USD' },
  META: { symbol: 'META', name: 'Meta Platforms', prefix: '₹', type: 'Stock', color: '#3b82f6', base: 'USD' },
  NFLX: { symbol: 'NFLX', name: 'Netflix Inc.', prefix: '₹', type: 'Stock', color: '#dc2626', base: 'USD' },
};

export default function App() {
  /* ── Auth State ─────────────────────────────────────────── */
  const [authUser, setAuthUser] = useState(() => {
    const saved = localStorage.getItem('tradingpulse_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('tradingpulse_token') || null;
  });

  const isAuthenticated = !!authUser && !!authToken;

  const handleAuthSuccess = (user, token) => {
    setAuthUser(user);
    setAuthToken(token);
  };

  const handleLogout = () => {
    setAuthUser(null);
    setAuthToken(null);
    localStorage.removeItem('tradingpulse_token');
    localStorage.removeItem('tradingpulse_user');
    setUserId(null);
    setBalance(100000);
    setPortfolio({});
    setTransactions([]);
    setEquityHistory([]);
  };

  /* ── If not authenticated, show auth screen ─────────────── */
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  /* ── Render the main trading dashboard ──────────────────── */
  return (
    <TradingDashboard
      authUser={authUser}
      setAuthUser={setAuthUser}
      authToken={authToken}
      onLogout={handleLogout}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   Trading Dashboard (extracted so auth gating is clean)
   ═══════════════════════════════════════════════════════════════ */
function TradingDashboard({ authUser, setAuthUser, authToken, onLogout }) {
  const [live, setLive] = useState(socket.connected);
  const [asset, setAsset] = useState('BTCUSDT');
  const [history, setHistory] = useState({
    BTCUSDT: [], ETHUSDT: [], AAPL: [], MSFT: [], GOOGL: [], AMZN: [], TSLA: [], NVDA: [], META: [], NFLX: []
  });
  const [latest, setLatest] = useState({
    BTCUSDT: { price: 0 }, ETHUSDT: { price: 0 },
    AAPL: { price: 0 }, MSFT: { price: 0 }, GOOGL: { price: 0 }, AMZN: { price: 0 },
    TSLA: { price: 0 }, NVDA: { price: 0 }, META: { price: 0 }, NFLX: { price: 0 }
  });
  const [userId, setUserId] = useState(authUser?.id || null);
  const [balance, setBalance] = useState(authUser?.balance || 100000);
  const [portfolio, setPortfolio] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [equityHistory, setEquityHistory] = useState([]);
  const [fundRequested, setFundRequested] = useState(false);
  const [news, setNews] = useState([]);
  const [liquidationAlert, setLiquidationAlert] = useState(null);
  const [balOk, setBalOk] = useState(true);
  const [pred, setPred] = useState(null);
  const [aiLoad, setAiLoad] = useState(false);
  const [aiUp, setAiUp] = useState(false);
  const [aiTs, setAiTs] = useState(null);
  const [viewMode, setViewMode] = useState('trading'); // 'trading' | 'admin'

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const countRef = useRef(0);
  const histRef = useRef(history);
  histRef.current = history;

  const userRef = useRef(userId);
  userRef.current = userId;

  /* ── Outside click for search dropdown ───────────────────── */
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  /* ── Bootstrap user from auth ────────────────────────────── */
  useEffect(() => {
    const bootstrapUser = async () => {
      try {
        const r = await axios.get(`${BACKEND}/api/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (r.data.success) {
          setUserId(r.data.data.id);
          setBalance(r.data.data.balance);
          setPortfolio(r.data.data.portfolio || {});
          setEquityHistory(r.data.data.equityHistory || []);
          setFundRequested(r.data.data.fundRequested || false);
          setBalOk(true);
          
          // Sync role and other details back to parent and localStorage
          if (r.data.data.role !== authUser?.role) {
             const updatedUser = { ...authUser, ...r.data.data };
             setAuthUser(updatedUser);
             localStorage.setItem('tradingpulse_user', JSON.stringify(updatedUser));
          }
        }
      } catch (e) {
        console.error("Failed to bootstrap user:", e);
        // Token may be expired — log out
        if (e.response?.status === 401) {
          onLogout();
        }
      }
    };
    bootstrapUser();
  }, [authToken]);

  /* ── Fetch news history on mount ─────────────────────────── */
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const r = await axios.get(`${BACKEND}/api/news`);
        if (r.data.success) {
          setNews(r.data.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch news history:", e);
      }
    };
    fetchNews();
  }, []);

  /* ── Fetch balance ───────────────────────────────────────── */
  const refreshBal = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await axios.get(`${BACKEND}/api/trade/balance/${userId}`);
      if (r.data.success) {
        setBalance(r.data.data.balance);
        setPortfolio(r.data.data.portfolio || {});
        setTransactions(r.data.data.recentTransactions || []);
        setEquityHistory(r.data.data.equityHistory || []);
        setBalOk(true);
      }
    } catch { /* silent */ }
  }, [userId]);

  useEffect(() => { refreshBal(); }, [refreshBal]);

  /* ── AI health loop ──────────────────────────────────────── */
  useEffect(() => {
    const ping = async () => {
      try {
        const r = await axios.get(`${AI_URL}/health`, { timeout: 3000 });
        setAiUp(r.data.status === 'ok');
      } catch { setAiUp(false); }
    };
    ping();
    const iv = setInterval(ping, 30000);
    return () => clearInterval(iv);
  }, []);

  /* ── AI prediction ───────────────────────────────────────── */
  const runAIForPrices = useCallback(async (symbol, prices) => {
    if (!aiUp || prices.length < 10) return;
    setAiLoad(true);
    try {
      const r = await axios.post(`${AI_URL}/predict`, {
        prices: prices, symbol: symbol,
      }, { timeout: 10000 });
      setPred(r.data);
      setAiTs(new Date().toISOString());
    } catch { /* silent */ }
    setAiLoad(false);
  }, [aiUp]);

  /* ── Fetch price history on asset change ─────────────────── */
  const fetchHistory = useCallback(async (symbol) => {
    try {
      const r = await axios.get(`${BACKEND}/api/prices/${symbol}?count=${MAX_HIST}`);
      if (r.data.success && r.data.data.prices.length > 0) {
        const prices = r.data.data.prices;
        const historyData = prices.map((price, idx) => ({
          price,
          timestamp: r.data.data.timestamps[idx]
        }));
        setHistory((prev) => ({
          ...prev,
          [symbol]: historyData
        }));
        runAIForPrices(symbol, prices);
      }
    } catch (e) {
      console.error(`Failed to fetch history for ${symbol}:`, e);
    }
  }, [runAIForPrices]);

  useEffect(() => {
    fetchHistory(asset);
  }, [asset, fetchHistory]);

  /* ── Socket.io ───────────────────────────────────────────── */
  useEffect(() => {
    const onC = () => setLive(true);
    const onD = () => setLive(false);

    const onUpdate = (data) => {
      if (!data?.prices) return;
      setLatest(data.prices);

      setHistory((prev) => {
        const next = { ...prev };
        for (const s of Object.keys(data.prices)) {
          if (data.prices[s]?.price > 0) {
            next[s] = [...(prev[s] || []), {
              price: data.prices[s].price,
              timestamp: data.prices[s].timestamp || data.timestamp,
            }].slice(-MAX_HIST);
          }
        }
        return next;
      });

      countRef.current += 1;
      if (countRef.current >= AI_INTERVAL) {
        countRef.current = 0;
        const currentHist = histRef.current[asset] || [];
        if (currentHist.length >= 10) {
          runAIForPrices(asset, currentHist.map((p) => p.price));
        }
      }
    };

    const onNewsFlash = (item) => {
      setNews((prev) => [item, ...prev].slice(0, 50));
    };

    const onPortfolioUpdate = (data) => {
      if (data.userId === userRef.current) {
        setBalance(data.balance);
        setPortfolio(data.portfolio || {});
      }
    };

    const onOrderLiquidated = (data) => {
      if (data.userId === userRef.current) {
        if (data.transaction) {
          setTransactions((prev) => [data.transaction, ...prev].slice(0, 20));
        }
        refreshBal();
        setLiquidationAlert({
          symbol: data.symbol,
          type: data.type,
          price: data.price,
          quantity: data.quantity,
          total: data.total,
        });
      }
    };

    socket.on('connect', onC);
    socket.on('disconnect', onD);
    socket.on('market_update', onUpdate);
    socket.on('news_flash', onNewsFlash);
    socket.on('portfolio_update', onPortfolioUpdate);
    socket.on('order_liquidated', onOrderLiquidated);

    return () => {
      socket.off('connect', onC);
      socket.off('disconnect', onD);
      socket.off('market_update', onUpdate);
      socket.off('news_flash', onNewsFlash);
      socket.off('portfolio_update', onPortfolioUpdate);
      socket.off('order_liquidated', onOrderLiquidated);
    };
  }, [asset, runAIForPrices, refreshBal]);

  /* ── Trade callback ──────────────────────────────────────── */
  const onTrade = (d) => {
    setBalance(d.balance);
    setPortfolio(d.portfolio || {});
    setEquityHistory(d.equityHistory || []);
    if (d.transaction) {
      setTransactions((prev) => [d.transaction, ...prev].slice(0, 20));
    }
    if (d.transaction?.userId || d.userId) setUserId(d.transaction?.userId || d.userId);
  };

  /* ── Filter dropdown assets ──────────────────────────────── */
  const filteredAssets = Object.values(ASSETS).filter(a =>
    a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeAssetInfo = ASSETS[asset] || ASSETS.BTCUSDT;
  const activePrice = latest[asset]?.price || 0;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', color: 'var(--text-primary)', overflow: 'hidden' }}>

      {/* ══════════════════════════════════════════════════════════
          TOP NAVIGATION BAR
          ══════════════════════════════════════════════════════════ */}
      <header className="nav-glow" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '64px',
        flexShrink: 0,
        background: 'rgba(8,12,20,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'relative',
        zIndex: 50,
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59,130,246,0.4)',
          }}>
            <Zap size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>
              TradingPulse<span style={{ color: '#3b82f6' }}>AI</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>
              Paper Terminal
            </div>
          </div>
        </div>

        {/* Center — Asset Dropdown Search Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: menuOpen ? '0 0 15px rgba(59,130,246,0.15)' : 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = menuOpen ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'; }}
            >
              <div style={{
                width: '26px', height: '26px', borderRadius: '6px',
                background: `${activeAssetInfo.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 800, color: activeAssetInfo.color,
              }}>
                {activeAssetInfo.prefix}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>
                  {activeAssetInfo.symbol.replace('USDT', '')} / {activeAssetInfo.base}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {activeAssetInfo.name}
                </span>
              </div>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '12px' }}>
                {activePrice > 0 ? `₹${activePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
              </span>
              <span style={{ fontSize: '8px', color: 'var(--text-muted)', marginLeft: '4px' }}>▼</span>
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: '8px',
                width: '340px', maxHeight: '420px',
                background: 'rgba(8,12,20,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px', overflow: 'hidden',
                boxShadow: '0 15px 35px -5px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02)',
                zIndex: 100, display: 'flex', flexDirection: 'column',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
              }}>
                {/* Search Header */}
                <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Search shares or crypto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%', padding: '6px 4px',
                      borderRadius: '6px', background: 'transparent',
                      border: 'none',
                      color: 'white', fontSize: '13px', outline: 'none',
                    }}
                  />
                </div>

                {/* Assets List */}
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '320px', padding: '6px' }}>
                  {filteredAssets.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      No assets found matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredAssets.map((item) => {
                      const sym = item.symbol;
                      const curPrice = latest[sym]?.price || 0;
                      const isActive = asset === sym;
                      return (
                        <button
                          key={sym}
                          onClick={() => {
                            setAsset(sym);
                            setPred(null);
                            setMenuOpen(false);
                            setSearchQuery('');
                          }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px', border: 'none', borderRadius: '8px',
                            background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                            marginBottom: '2px',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = isActive ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(59,130,246,0.08)' : 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '6px',
                              background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '11px', fontWeight: 800, color: item.color,
                            }}>
                              {item.prefix}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>
                                {sym.replace('USDT', '')}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {item.name}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>
                              {curPrice > 0 ? `₹${curPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </div>
                            <span style={{
                              fontSize: '8px', fontWeight: 700,
                              color: item.type === 'Crypto' ? '#f59e0b' : '#3b82f6',
                              background: item.type === 'Crypto' ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)',
                              padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>
                              {item.type}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — User Info + Balance + Status + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* Balance */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 16px',
            borderRadius: '10px',
            background: 'rgba(5,150,105,0.07)',
            border: '1px solid rgba(5,150,105,0.15)',
          }}>
            <Wallet size={15} color="var(--accent-green)" />
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Paper Balance
              </div>
              <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-green)', marginTop: '1px' }}>
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Live badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 14px',
            borderRadius: '99px',
            border: live ? '1px solid rgba(5,150,105,0.25)' : '1px solid rgba(190,18,60,0.25)',
            background: live ? 'rgba(5,150,105,0.06)' : 'rgba(190,18,60,0.06)',
            fontSize: '12px', fontWeight: 700,
            color: live ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            <span
              className={live ? 'beacon' : ''}
              style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: live ? 'var(--accent-green)' : 'var(--accent-red)',
                display: 'inline-block',
              }}
            />
            {live ? 'Live' : 'Offline'}
          </div>

          {/* User badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {authUser?.role === 'admin' ? (
              <Shield size={14} color="#f59e0b" />
            ) : (
              <User size={14} color="#64748b" />
            )}
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
              {authUser?.username}
            </span>
            {authUser?.role === 'admin' && (
              <span style={{
                fontSize: '8px', fontWeight: 800,
                color: '#f59e0b',
                background: 'rgba(245,158,11,0.1)',
                padding: '1px 5px', borderRadius: '4px',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Admin
              </span>
            )}
          </div>

          {/* Admin Toggle Button */}
          {authUser?.role === 'admin' && (
            <button
              onClick={() => setViewMode(prev => prev === 'trading' ? 'admin' : 'trading')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(245,158,11,0.2)',
                background: viewMode === 'admin' ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.05)',
                color: '#f59e0b',
                fontSize: '12px', fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = viewMode === 'admin' ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.05)'; }}
            >
              {viewMode === 'trading' ? <Shield size={14} /> : <LayoutDashboard size={14} />}
              {viewMode === 'trading' ? 'Admin Portal' : 'Terminal'}
            </button>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(190,18,60,0.15)',
              background: 'rgba(190,18,60,0.05)',
              color: 'var(--accent-red)',
              fontSize: '12px', fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(190,18,60,0.1)'; e.currentTarget.style.borderColor = 'rgba(190,18,60,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(190,18,60,0.05)'; e.currentTarget.style.borderColor = 'rgba(190,18,60,0.15)'; }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          MAIN LAYOUT
          ══════════════════════════════════════════════════════════ */}
      {viewMode === 'admin' ? (
        <AdminDashboard authToken={authToken} />
      ) : (
        <main style={{ flex: 1, display: 'flex', minHeight: 0, padding: '16px', gap: '16px' }}>

          {/* ── Chart Panel ────────────────────────────────────── */}
          <section
            className="panel-shadow"
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: '16px',
            background: 'var(--bg-panel)',
            border: '1px solid rgba(255,255,255,0.07)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
          }}
        >
          <MarketChart priceData={history[asset]} symbol={asset} />
        </section>

        {/* ── Sidebar Panel ─────────────────────────────────── */}
        <aside style={{ width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <SidebarPanel
            userId={userId}
            authToken={authToken}
            activeAsset={asset}
            currentPrices={latest}
            balance={balance}
            portfolio={portfolio}
            transactions={transactions}
            equityHistory={equityHistory}
            fundRequested={fundRequested}
            setFundRequested={setFundRequested}
            news={news}
            liquidationAlert={liquidationAlert}
            setLiquidationAlert={setLiquidationAlert}
            onTradeComplete={onTrade}
            aiPrediction={pred}
            aiLoading={aiLoad}
            aiConnected={aiUp}
            aiLastUpdated={aiTs}
          />
        </aside>
      </main>
      )}
    </div>
  );
}
