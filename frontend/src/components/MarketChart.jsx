import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Eye, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Zoom hook — shared between Area and Candlestick charts.
   Returns the visible data slice + helpers.
   ───────────────────────────────────────────────────────────── */
function useChartZoom(dataLength) {
  // zoomLevel: 1 = 100% (show all data), higher = more zoomed in
  const [zoomLevel, setZoomLevel] = useState(1);
  // panOffset: 0 = rightmost (latest data), positive = scroll left into history
  const [panOffset, setPanOffset] = useState(0);

  // Drag state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);

  const maxZoom = 10;
  const minZoom = 1;

  // How many points are visible at the current zoom
  const visibleCount = Math.max(5, Math.floor(dataLength / zoomLevel));

  // Clamp panOffset
  const maxPan = Math.max(0, dataLength - visibleCount);
  const clampedPan = Math.min(Math.max(0, panOffset), maxPan);

  const startIdx = Math.max(0, dataLength - visibleCount - clampedPan);
  const endIdx = Math.min(dataLength, startIdx + visibleCount);

  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(maxZoom, prev * 1.4));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const next = Math.max(minZoom, prev / 1.4);
      if (next <= 1.05) {
        setPanOffset(0);
        return 1;
      }
      return next;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanOffset(0);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
      // Scroll up = zoom in
      setZoomLevel(prev => Math.min(maxZoom, prev * 1.15));
    } else {
      // Scroll down = zoom out
      setZoomLevel(prev => {
        const next = Math.max(minZoom, prev / 1.15);
        if (next <= 1.05) {
          setPanOffset(0);
          return 1;
        }
        return next;
      });
    }
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (zoomLevel <= 1) return;
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartOffset.current = panOffset;
    e.currentTarget.style.cursor = 'grabbing';
  }, [zoomLevel, panOffset]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStartX.current;
    // Convert pixel drag to data-point offset
    const containerWidth = e.currentTarget.getBoundingClientRect().width;
    const pointsPerPixel = visibleCount / containerWidth;
    const newOffset = dragStartOffset.current + dx * pointsPerPixel;
    setPanOffset(Math.min(Math.max(0, newOffset), maxPan));
  }, [visibleCount, maxPan]);

  const handleMouseUp = useCallback((e) => {
    isDragging.current = false;
    if (e.currentTarget) {
      e.currentTarget.style.cursor = zoomLevel > 1 ? 'grab' : 'crosshair';
    }
  }, [zoomLevel]);

  const handleMouseLeave = useCallback((e) => {
    isDragging.current = false;
    if (e.currentTarget) {
      e.currentTarget.style.cursor = zoomLevel > 1 ? 'grab' : 'crosshair';
    }
  }, [zoomLevel]);

  return {
    zoomLevel,
    startIdx,
    endIdx,
    visibleCount,
    zoomIn,
    zoomOut,
    resetZoom,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    isZoomed: zoomLevel > 1.05,
  };
}

/* ─────────────────────────────────────────────────────────────
   Pure SVG Candlestick Chart — ResizeObserver for dimensions
   ───────────────────────────────────────────────────────────── */
function SVGCandlestickChart({ data, showSMA, zoomHandlers }) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ width: 600, height: 350 });
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // ─── Throttled render data ────────────────────────────────────────
  const [renderData, setRenderData] = useState(data);
  const latestDataRef  = useRef(data);
  const throttleRef    = useRef(null);
  latestDataRef.current = data;

  useEffect(() => {
    if (data.length === 0) return;
    if (renderData.length === 0) { setRenderData(data); return; }
    if (!throttleRef.current) {
      throttleRef.current = setTimeout(() => {
        setRenderData(latestDataRef.current);
        throttleRef.current = null;
      }, 2000);
    }
  }, [data]);

  useEffect(() => () => { if (throttleRef.current) clearTimeout(throttleRef.current); }, []);

  // ─── ResizeObserver (debounced 120ms) ────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let raf = null;
    const ro = new ResizeObserver(entries => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) setDims({ width, height });
        }
      });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // ─── Attach wheel listener with passive: false ─────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !zoomHandlers) return;
    const handler = (e) => zoomHandlers.handleWheel(e);
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [zoomHandlers]);

  const PAD = { top: 14, right: 14, bottom: 32, left: 86 };
  const { width, height } = dims;
  const W = Math.max(1, width  - PAD.left - PAD.right);
  const H = Math.max(1, height - PAD.top  - PAD.bottom);

  const allPrices = useMemo(() => {
    const vals = [];
    renderData.forEach(d => { vals.push(d.high, d.low); });
    if (showSMA) renderData.forEach(d => {
      if (d.sma5  != null) vals.push(d.sma5);
      if (d.sma20 != null) vals.push(d.sma20);
    });
    return vals.filter(v => isFinite(v));
  }, [renderData, showSMA]);

  const minP = allPrices.length ? Math.min(...allPrices) : 0;
  const maxP = allPrices.length ? Math.max(...allPrices) : 1;
  const priceRange = maxP - minP || 1;
  const midP = (minP + maxP) / 2;
  const minRange = midP * 0.0005;
  const effectiveRange = Math.max(priceRange, minRange);
  const pad = effectiveRange * 0.05;
  const domainMin = minP - pad;
  const domainMax = maxP + pad;
  const domainRange = domainMax - domainMin || 1;

  const toY = useCallback((p) => PAD.top + H - ((p - domainMin) / domainRange) * H, [H, domainMin, domainRange]);

  const n = renderData.length;
  const barSlot = W / Math.max(n, 1);
  const bodyW = Math.max(8, Math.min(24, barSlot * 0.8));

  const yTickVals = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => domainMin + (domainRange * i) / 5)
  , [domainMin, domainRange]);

  const xTickStep = Math.max(1, Math.round(80 / barSlot));
  const xTickIdxs = renderData.reduce((acc, _, i) => {
    if (i === 0 || i === n - 1 || i % xTickStep === 0) acc.push(i);
    return acc;
  }, []);

  const handleCandleMouseMove = useCallback((e, item) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setHovered(item);
  }, []);

  const handleCandleMouseLeave = useCallback(() => setHovered(null), []);

  // SMA polyline points
  const sma5Points  = showSMA ? renderData.map((d, i) => d.sma5  != null ? `${PAD.left + (i + 0.5) * barSlot},${toY(d.sma5)}`  : null).filter(Boolean) : [];
  const sma20Points = showSMA ? renderData.map((d, i) => d.sma20 != null ? `${PAD.left + (i + 0.5) * barSlot},${toY(d.sma20)}` : null).filter(Boolean) : [];

  const EASE = 'y 0.6s cubic-bezier(0.4,0,0.2,1), height 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease';

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: zoomHandlers?.isZoomed ? 'grab' : 'crosshair',
      }}
      onMouseDown={zoomHandlers?.handleMouseDown}
      onMouseMove={(e) => {
        zoomHandlers?.handleMouseMove(e);
      }}
      onMouseUp={zoomHandlers?.handleMouseUp}
      onMouseLeave={(e) => {
        zoomHandlers?.handleMouseLeave(e);
      }}
    >
      <svg
        width={width}
        height={height}
        style={{
          display: 'block',
          userSelect: 'none',
          willChange: 'transform',
        }}
      >

        {/* Grid lines */}
        {yTickVals.map((v, i) => (
          <line key={i} x1={PAD.left} y1={toY(v)} x2={PAD.left + W} y2={toY(v)}
            stroke="rgba(255,255,255,0.04)" strokeDasharray="1 6"
            style={{ transition: 'y1 0.6s ease, y2 0.6s ease' }} />
        ))}

        {/* Y Axis labels */}
        {yTickVals.map((v, i) => (
          <text key={i} x={PAD.left - 6} y={toY(v)}
            textAnchor="end" dominantBaseline="middle"
            fill="#334155" fontSize={11} fontFamily="JetBrains Mono, monospace"
            style={{ transition: 'y 0.6s ease' }}>
            {v >= 1000 ? `₹${(v / 1000).toFixed(2)}k` : `₹${v.toFixed(0)}`}
          </text>
        ))}

        {/* X Axis labels */}
        {xTickIdxs.map((i) => (
          <text key={i} x={PAD.left + (i + 0.5) * barSlot} y={PAD.top + H + 16}
            textAnchor="middle" fill="#334155" fontSize={11} fontFamily="JetBrains Mono, monospace">
            {renderData[i]?.time}
          </text>
        ))}

        {/* SMA lines */}
        {sma5Points.length  > 1 && <polyline points={sma5Points.join(' ')}  fill="none" stroke="#f59e0b" strokeWidth={1.5} style={{ transition: 'opacity 0.4s ease' }} />}
        {sma20Points.length > 1 && <polyline points={sma20Points.join(' ')} fill="none" stroke="#3b82f6" strokeWidth={1.5} style={{ transition: 'opacity 0.4s ease' }} />}

        {/* Candles */}
        {renderData.map((d, i) => {
          const bullish = d.close >= d.open;
          const candleColor = bullish ? 'var(--accent-green)' : 'var(--accent-red)';
          const cx = PAD.left + (i + 0.5) * barSlot;

          const yHigh  = toY(d.high);
          const yLow   = toY(d.low);
          const yOpen  = toY(d.open);
          const yClose = toY(d.close);

          const bodyCenter = (yOpen + yClose) / 2;
          const rawBodyH   = Math.abs(yClose - yOpen);
          const bodyH      = Math.max(3, rawBodyH);
          const bodyTop    = bodyCenter - bodyH / 2;

          const wickTop    = Math.min(yHigh, bodyTop - 4);
          const wickBottom = Math.max(yLow,  bodyTop + bodyH + 4);

          return (
            <g key={i} onMouseMove={(e) => handleCandleMouseMove(e, d)} onMouseLeave={handleCandleMouseLeave} style={{ cursor: zoomHandlers?.isZoomed ? 'grab' : 'crosshair' }}>
              {/* Invisible wide hit area */}
              <rect x={cx - barSlot / 2} y={PAD.top} width={barSlot} height={H} fill="transparent" />
              {/* Upper wick */}
              <line x1={cx} y1={wickTop} x2={cx} y2={bodyTop}
                stroke={candleColor} strokeWidth={2} strokeOpacity={0.75}
                style={{ transition: EASE }} />
              {/* Lower wick */}
              <line x1={cx} y1={bodyTop + bodyH} x2={cx} y2={wickBottom}
                stroke={candleColor} strokeWidth={2} strokeOpacity={0.75}
                style={{ transition: EASE }} />
              {/* Body */}
              <rect
                x={cx - bodyW / 2} y={bodyTop}
                width={bodyW} height={bodyH}
                fill={candleColor}
                fillOpacity={bullish ? 0.82 : 1}
                stroke={candleColor}
                strokeWidth={1.5}
                rx={2}
                style={{ transition: EASE }}
              />
              {/* Bullish inner highlight */}
              {bullish && bodyW > 10 && (
                <rect
                  x={cx - bodyW / 2 + 3} y={bodyTop + 3}
                  width={Math.max(2, bodyW * 0.3)} height={Math.max(2, bodyH - 6)}
                  fill="rgba(255,255,255,0.18)" rx={1.5}
                  style={{ transition: EASE }}
                />
              )}
            </g>
          );
        })}

        {/* Crosshair + Tooltip */}
        {hovered && (() => {
          const isBull = hovered.close >= hovered.open;
          const tc = isBull ? 'var(--accent-green)' : 'var(--accent-red)';
          const TX = Math.min(mousePos.x + 14, width  - 168);
          const TY = Math.max(PAD.top, Math.min(mousePos.y - 65, PAD.top + H - 135));
          return (
            <>
              <line x1={mousePos.x} y1={PAD.top} x2={mousePos.x} y2={PAD.top + H}
                stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />
              <line x1={PAD.left} y1={mousePos.y} x2={PAD.left + W} y2={mousePos.y}
                stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" strokeWidth={1} />
              <foreignObject x={TX} y={TY} width={158} height={132}>
                <div
                  xmlns="http://www.w3.org/1999/xhtml"
                  style={{
                    background: 'rgba(8,12,20,0.97)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '10px 13px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  <div style={{ color: '#64748b', fontWeight: 600, marginBottom: 6 }}>{hovered.time}</div>
                  {[['Open', hovered.open, 'white'], ['Close', hovered.close, tc], ['High', hovered.high, 'var(--accent-green)'], ['Low', hovered.low, 'var(--accent-red)']]
                    .map(([lbl, val, col]) => (
                      <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                        <span style={{ color: '#64748b' }}>{lbl}</span>
                        <span style={{ color: col, fontWeight: 700 }}>₹{typeof val === 'number' ? val.toFixed(2) : '—'}</span>
                      </div>
                    ))
                  }
                </div>
              </foreignObject>
            </>
          );
        })()}
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Custom Tooltip for Area chart
   ───────────────────────────────────────────────────────────── */
function PriceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'rgba(8,12,20,0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>{d.time}</p>
      <p style={{ fontSize: '17px', fontWeight: 800, color: 'white', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.5px' }}>
        ₹{Number(d.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      {d.sma5  && <p style={{ fontSize: '10px', color: '#f59e0b', margin: '4px 0 0 0', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>SMA5: ₹{d.sma5.toFixed(2)}</p>}
      {d.sma20 && <p style={{ fontSize: '10px', color: '#3b82f6', margin: '2px 0 0 0' }}>SMA20: ₹{d.sma20.toFixed(2)}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Skeleton
   ───────────────────────────────────────────────────────────── */
function ChartSkeleton() {
  const bars = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => {
      const base = 40 + Math.sin(i * 0.35) * 50;
      const jitter = Math.sin(i * 1.7) * 20;
      return Math.max(16, base + jitter);
    });
  }, []);

  return (
    <div className="skel-wave" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '55%', padding: '0 16px', width: '100%' }}>
        {bars.map((h, i) => (
          <div
            key={i}
            className="skel"
            style={{
              flex: 1,
              height: `${h}%`,
              maxWidth: '12px',
              minWidth: '3px',
              borderRadius: '3px 3px 0 0',
              animationDelay: `${i * 45}ms`,
            }}
          />
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#94a3b8' }}>Connecting to live market feed…</p>
        <p style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>Real-time price data will appear here</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Zoom Controls Bar
   ───────────────────────────────────────────────────────────── */
function ZoomControls({ zoomLevel, isZoomed, onZoomIn, onZoomOut, onReset }) {
  const btnStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.15s',
  };

  const activeBtnStyle = {
    ...btnStyle,
    background: 'rgba(59,130,246,0.12)',
    borderColor: 'rgba(59,130,246,0.25)',
    color: '#3b82f6',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {/* Zoom indicator badge */}
      {isZoomed && (
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#3b82f6',
          background: 'rgba(59,130,246,0.1)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {Math.round(zoomLevel * 100)}%
        </span>
      )}

      <button
        onClick={onZoomIn}
        style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
        title="Zoom In (scroll up)"
      >
        <ZoomIn size={13} />
      </button>

      <button
        onClick={onZoomOut}
        style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
        title="Zoom Out (scroll down)"
      >
        <ZoomOut size={13} />
      </button>

      {isZoomed && (
        <button
          onClick={onReset}
          style={activeBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)'; }}
          title="Reset zoom"
        >
          <Maximize2 size={12} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Area Chart Wrapper with zoom/pan mouse handlers
   ───────────────────────────────────────────────────────────── */
function ZoomableAreaChart({ chartData, yDomain, color, symbol, showSMA, zoomHandlers }) {
  const containerRef = useRef(null);

  // Attach wheel listener with passive: false so preventDefault works
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !zoomHandlers) return;
    const handler = (e) => zoomHandlers.handleWheel(e);
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [zoomHandlers]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        cursor: zoomHandlers?.isZoomed ? 'grab' : 'crosshair',
      }}
      onMouseDown={zoomHandlers?.handleMouseDown}
      onMouseMove={zoomHandlers?.handleMouseMove}
      onMouseUp={zoomHandlers?.handleMouseUp}
      onMouseLeave={zoomHandlers?.handleMouseLeave}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.3} />
              <stop offset="60%"  stopColor={color} stopOpacity={0.06} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="1 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: '#334155', fontSize: 11, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false} tickLine={false}
            interval="preserveStartEnd" minTickGap={80}
          />
          <YAxis
            domain={yDomain}
            tick={{ fill: '#334155', fontSize: 11, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false} tickLine={false}
            tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(2)}k` : `₹${v.toFixed(0)}`}
            width={45}
          />
          <Tooltip
            content={<PriceTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone" dataKey="price"
            stroke={color} strokeWidth={2}
            fill={`url(#grad-${symbol})`}
            dot={false}
            activeDot={{ r: 5, fill: color, stroke: '#080c14', strokeWidth: 3, filter: 'url(#glow)' }}
            isAnimationActive={false}
          />
          {showSMA && (
            <>
              <Line type="monotone" dataKey="sma5"  stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="sma20" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MarketChart
   ───────────────────────────────────────────────────────────── */
export default function MarketChart({ priceData = [], symbol = 'BTCUSDT' }) {
  const [chartType, setChartType] = useState('area'); // 'area' | 'candles'
  const [showSMA, setShowSMA] = useState(true);

  const ready = priceData.length >= 5;

  /* ── Zoom state ── */
  const zoom = useChartZoom(priceData.length);

  /* ── Visible (zoomed) price data slice ── */
  const visiblePriceData = useMemo(() => {
    if (!zoom.isZoomed) return priceData;
    return priceData.slice(zoom.startIdx, zoom.endIdx);
  }, [priceData, zoom.isZoomed, zoom.startIdx, zoom.endIdx]);

  /* ── Area Chart Dataset ── */
  const chartData = useMemo(() => {
    return visiblePriceData.map((pt, i) => {
      const slice5  = visiblePriceData.slice(Math.max(0, i - 4),  i + 1).map(x => x.price);
      const slice20 = visiblePriceData.slice(Math.max(0, i - 19), i + 1).map(x => x.price);
      const sma5  = slice5.reduce((a, b)  => a + b, 0) / slice5.length;
      const sma20 = slice20.reduce((a, b) => a + b, 0) / slice20.length;
      return {
        index: i,
        price: pt.price,
        sma5:  i >= 4  ? parseFloat(sma5.toFixed(2))  : null,
        sma20: i >= 19 ? parseFloat(sma20.toFixed(2)) : null,
        time: pt.timestamp
          ? new Date(pt.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            })
          : `T${i}`,
      };
    });
  }, [visiblePriceData]);

  /* ── Candlestick Dataset ── */
  const candlestickData = useMemo(() => {
    if (visiblePriceData.length < 5) return [];

    const groupSize = Math.max(3, Math.ceil(visiblePriceData.length / 15));
    const candles = [];

    for (let i = 0; i < visiblePriceData.length; i += groupSize) {
      const chunk = visiblePriceData.slice(i, i + groupSize);
      if (chunk.length === 0) continue;
      const prices = chunk.map(pt => pt.price).filter(p => typeof p === 'number' && isFinite(p));
      if (prices.length === 0) continue;

      const open  = prices[0];
      const close = prices[prices.length - 1];
      const high  = Math.max(...prices);
      const low   = Math.min(...prices);
      const ts    = chunk[chunk.length - 1].timestamp;
      const timeStr = ts
        ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        : `C${candles.length}`;

      candles.push({ time: timeStr, open, high, low, close });
    }

    return candles.map((c, i) => {
      const slice5  = candles.slice(Math.max(0, i - 4),  i + 1).map(x => x.close);
      const slice20 = candles.slice(Math.max(0, i - 19), i + 1).map(x => x.close);
      const sma5  = slice5.reduce((a, b)  => a + b, 0) / slice5.length;
      const sma20 = slice20.reduce((a, b) => a + b, 0) / slice20.length;
      return {
        ...c,
        sma5:  i >= 4  ? parseFloat(sma5.toFixed(2))  : null,
        sma20: i >= 19 ? parseFloat(sma20.toFixed(2)) : null,
      };
    });
  }, [visiblePriceData]);

  /* ── Stats use FULL priceData (not zoomed) for header display ── */
  const stats = useMemo(() => {
    if (!ready) return null;
    const allPrices = priceData.map(d => d.price);
    const cur   = allPrices[allPrices.length - 1];
    const first = allPrices[0];
    const chg   = cur - first;
    const pct   = (chg / first) * 100;
    return { current: cur, change: chg, pct, high: Math.max(...allPrices), low: Math.min(...allPrices) };
  }, [priceData, ready]);

  const yDomain = useMemo(() => {
    if (!ready) return [0, 100];
    const p = chartData.map(d => d.price);
    const lo = Math.min(...p);
    const hi = Math.max(...p);
    const pad = (hi - lo) * 0.18 || hi * 0.003;
    return [lo - pad, hi + pad];
  }, [chartData, ready]);

  const up    = stats ? stats.pct >= 0 : true;
  const color = up ? 'var(--accent-green)' : 'var(--accent-red)';
  const sym   = symbol.replace('USDT', '');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>

          {/* Left: Price info */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.06em', marginBottom: '6px' }}>
              {sym}<span style={{ color: '#334155' }}> / {symbol.endsWith('USDT') ? 'USDT' : 'USD'}</span>
              <span style={{
                marginLeft: '10px',
                padding: '2px 8px',
                borderRadius: '99px',
                fontSize: '10px',
                fontWeight: 700,
                background: 'rgba(59,130,246,0.1)',
                color: '#3b82f6',
                border: '1px solid rgba(59,130,246,0.2)',
                letterSpacing: '0.05em',
              }}>
                LIVE
              </span>
            </div>

            {ready ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                <span style={{
                  fontSize: '38px',
                  fontWeight: 900,
                  color: 'white',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '-2px',
                  lineHeight: 1,
                }}>
                  ₹{stats.current.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '14px', fontWeight: 700,
                  color, padding: '4px 10px',
                  borderRadius: '8px',
                  background: up ? 'rgba(5,150,105,0.1)' : 'rgba(190,18,60,0.1)',
                  border: `1px solid ${up ? 'rgba(5,150,105,0.2)' : 'rgba(190,18,60,0.2)'}`,
                }}>
                  {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {up ? '+' : ''}{stats.pct.toFixed(3)}%
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
                <div className="skel" style={{ height: '42px', width: '220px', borderRadius: '10px' }} />
                <div className="skel" style={{ height: '28px', width: '80px',  borderRadius: '8px'  }} />
              </div>
            )}
          </div>

          {/* Right: Stats */}
          {ready && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { label: 'Session High', value: stats.high,   color: 'var(--accent-green)' },
                { label: 'Session Low',  value: stats.low,    color: 'var(--accent-red)' },
                { label: 'Change',       value: stats.change, color: up ? 'var(--accent-green)' : 'var(--accent-red)', prefix: up ? '+' : '' },
              ].map(({ label, value, color: c, prefix = '' }) => (
                <div key={label} style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'right',
                  minWidth: '110px',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: c, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.5px' }}>
                    {prefix}₹{Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Controls Toolbar ──────────────────────────────────── */}
      {ready && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '16px', flexShrink: 0,
        }}>
          {/* Left: Chart type toggle */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '8px' }}>
            {[
              { id: 'area',    label: 'Area Chart'    },
              { id: 'candles', label: 'Candlesticks'  },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setChartType(t.id)}
                style={{
                  padding: '5px 12px', borderRadius: '6px',
                  fontSize: '11px', fontWeight: 700,
                  background: chartType === t.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                  border: 'none',
                  color: chartType === t.id ? '#3b82f6' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Center: SMA toggle */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={showSMA}
                onChange={() => setShowSMA(!showSMA)}
                style={{ cursor: 'pointer', accentColor: '#3b82f6', width: '13px', height: '13px' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={12} /> Show Moving Averages
              </span>
            </label>
            {showSMA && (
              <div style={{ display: 'flex', gap: '8px', fontSize: '9px', fontWeight: 800 }}>
                <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '2px 6px', borderRadius: '4px' }}>SMA (5)</span>
                <span style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.08)', padding: '2px 6px', borderRadius: '4px' }}>SMA (20)</span>
              </div>
            )}
          </div>

          {/* Right: Zoom controls */}
          <ZoomControls
            zoomLevel={zoom.zoomLevel}
            isZoomed={zoom.isZoomed}
            onZoomIn={zoom.zoomIn}
            onZoomOut={zoom.zoomOut}
            onReset={zoom.resetZoom}
          />
        </div>
      )}

      {/* ── Chart Rendering ───────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {!ready ? (
          <ChartSkeleton />
        ) : chartType === 'candles' ? (
          /* ── Pure SVG Candlestick Chart ── */
          <SVGCandlestickChart
            data={candlestickData}
            showSMA={showSMA}
            symbol={symbol}
            zoomHandlers={zoom}
          />
        ) : (
          /* ── Area Chart (Recharts) ── */
          <ZoomableAreaChart
            chartData={chartData}
            yDomain={yDomain}
            color={color}
            symbol={symbol}
            showSMA={showSMA}
            zoomHandlers={zoom}
          />
        )}
      </div>

      {/* ── Zoom hint (shown when not zoomed) ── */}
      {ready && !zoom.isZoomed && (
        <div style={{
          textAlign: 'center',
          padding: '4px 0 0 0',
          fontSize: '10px',
          color: '#334155',
          fontWeight: 500,
          flexShrink: 0,
        }}>
          Scroll to zoom • Drag to pan when zoomed
        </div>
      )}
    </div>
  );
}
