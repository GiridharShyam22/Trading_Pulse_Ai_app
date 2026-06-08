import { useState } from 'react';
import { Zap, Mail, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const BACKEND = 'https://trading-pulse-backend.onrender.com';

export default function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (mode === 'signup') {
        if (!form.username || !form.email || !form.password) {
          setError('All fields are required');
          setLoading(false);
          return;
        }
        res = await axios.post(`${BACKEND}/api/auth/register`, {
          username: form.username,
          email: form.email,
          password: form.password,
        });
      } else {
        if (!form.email || !form.password) {
          setError('Email and password are required');
          setLoading(false);
          return;
        }
        res = await axios.post(`${BACKEND}/api/auth/login`, {
          email: form.email,
          password: form.password,
        });
      }

      if (res.data.success) {
        const { user, token } = res.data.data;
        localStorage.setItem('tradingpulse_token', token);
        localStorage.setItem('tradingpulse_user', JSON.stringify(user));
        onAuthSuccess(user, token);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      setError(msg);
    }
    setLoading(false);
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setForm({ username: '', email: '', password: '' });
  };

  /* ── Shared Styles ─────────────────────────────────────────── */
  const inputWrapperStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    transition: 'all 0.2s',
  };

  const inputStyle = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f1f5f9',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'Inter, sans-serif',
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background ambient glow */}
      <div style={{
        position: 'absolute',
        top: '-20%', left: '50%',
        transform: 'translateX(-50%)',
        width: '600px', height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%', right: '-10%',
        width: '500px', height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />

      {/* Auth Card */}
      <div className="enter" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px 36px',
        borderRadius: '20px',
        background: 'rgba(13,17,23,0.85)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02)',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(59,130,246,0.35)',
            marginBottom: '16px',
          }}>
            <Zap size={24} color="white" />
          </div>
          <h1 style={{
            fontSize: '24px', fontWeight: 800, color: '#f1f5f9',
            letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '6px',
          }}>
            TradingPulse<span style={{ color: '#3b82f6' }}>AI</span>
          </h1>
          <p style={{
            fontSize: '13px', color: '#64748b', fontWeight: 500,
          }}>
            {mode === 'login' ? 'Sign in to your trading terminal' : 'Create your trading account'}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="fade-in" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(190,18,60,0.08)',
            border: '1px solid rgba(190,18,60,0.2)',
            marginBottom: '20px',
            fontSize: '12px', fontWeight: 600,
            color: 'var(--accent-red)',
          }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Username (signup only) */}
          {mode === 'signup' && (
            <div style={inputWrapperStyle}>
              <User size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={handleChange('username')}
                style={inputStyle}
                autoComplete="username"
              />
            </div>
          )}

          {/* Email */}
          <div style={inputWrapperStyle}>
            <Mail size={16} color="#64748b" />
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange('email')}
              style={inputStyle}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div style={inputWrapperStyle}>
            <Lock size={16} color="#64748b" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={form.password}
              onChange={handleChange('password')}
              style={inputStyle}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', padding: '2px', display: 'flex',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '14px 20px',
              borderRadius: '12px',
              border: 'none',
              background: loading
                ? 'rgba(59,130,246,0.3)'
                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              marginTop: '6px',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(59,130,246,0.3)',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{
          textAlign: 'center', marginTop: '24px',
          fontSize: '13px', color: '#64748b',
        }}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={toggleMode}
            style={{
              background: 'none', border: 'none',
              color: '#3b82f6', fontWeight: 700,
              cursor: 'pointer', marginLeft: '6px',
              fontSize: '13px',
            }}
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        {/* Admin hint */}
        <div style={{
          marginTop: '24px',
          padding: '12px 14px',
          borderRadius: '10px',
          background: 'rgba(59,130,246,0.04)',
          border: '1px solid rgba(59,130,246,0.1)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '10px', color: '#475569', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Demo Admin Access
          </p>
          <p style={{ fontSize: '11px', color: '#64748b' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8' }}>admin@tradingpulse.com</span>
            {' / '}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8' }}>admin123</span>
          </p>
        </div>
      </div>

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
