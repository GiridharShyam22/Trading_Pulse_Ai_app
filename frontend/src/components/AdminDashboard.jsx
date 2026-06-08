import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Users, IndianRupee, RefreshCw, Shield, Clock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

const BACKEND = 'http://localhost:5005';

export default function AdminDashboard({ authToken }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fundingUser, setFundingUser] = useState(null); // userId currently being funded
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${BACKEND}/api/admin/users`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    }
    setLoading(false);
  }, [authToken]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddFunds = async (userId, username) => {
    setFundingUser(userId);
    setSuccessMsg('');
    setError('');
    try {
      const res = await axios.post(
        `${BACKEND}/api/admin/add-funds/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (res.data.success) {
        setSuccessMsg(`₹1,00,000 added to ${username}'s account`);
        // Refresh the user list
        await fetchUsers();
        // Auto-clear success message after 4 seconds
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add funds');
    }
    setFundingUser(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      overflow: 'hidden',
    }}>
      {/* ── Admin Header ─────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={22} color="#f59e0b" />
          </div>
          <div>
            <h2 style={{
              fontSize: '22px', fontWeight: 800, color: '#f1f5f9',
              letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '4px',
            }}>
              Admin Portal
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              Manage users and fund accounts
            </p>
          </div>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: '#94a3b8',
            fontSize: '12px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── Stats Row ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '16px',
        marginBottom: '24px', flexShrink: 0,
      }}>
        {[
          {
            label: 'Total Users',
            value: users.length,
            icon: <Users size={18} color="#3b82f6" />,
            bg: 'rgba(59,130,246,0.08)',
            border: 'rgba(59,130,246,0.15)',
            color: '#3b82f6',
          },
          {
            label: 'Admin Accounts',
            value: users.filter(u => u.role === 'admin').length,
            icon: <Shield size={18} color="#f59e0b" />,
            bg: 'rgba(245,158,11,0.08)',
            border: 'rgba(245,158,11,0.15)',
            color: '#f59e0b',
          },
          {
            label: 'Total Funds Across Users',
            value: `₹${users.reduce((sum, u) => sum + (u.balance || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            icon: <IndianRupee size={18} color="var(--accent-green)" />,
            bg: 'rgba(5,150,105,0.08)',
            border: 'rgba(5,150,105,0.15)',
            color: 'var(--accent-green)',
            mono: true,
          },
        ].map((stat) => (
          <div key={stat.label} style={{
            flex: 1,
            padding: '18px 20px',
            borderRadius: '14px',
            background: stat.bg,
            border: `1px solid ${stat.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              {stat.icon}
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {stat.label}
              </span>
            </div>
            <div style={{
              fontSize: '24px', fontWeight: 800, color: stat.color,
              fontFamily: stat.mono ? 'JetBrains Mono, monospace' : 'inherit',
              letterSpacing: stat.mono ? '-1px' : '-0.5px',
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Success / Error Messages ─────────────────────────── */}
      {successMsg && (
        <div className="fade-in" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', borderRadius: '10px',
          background: 'rgba(5,150,105,0.08)',
          border: '1px solid rgba(5,150,105,0.2)',
          marginBottom: '16px', flexShrink: 0,
          fontSize: '12px', fontWeight: 600, color: 'var(--accent-green)',
        }}>
          <CheckCircle2 size={15} />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="fade-in" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', borderRadius: '10px',
          background: 'rgba(190,18,60,0.08)',
          border: '1px solid rgba(190,18,60,0.2)',
          marginBottom: '16px', flexShrink: 0,
          fontSize: '12px', fontWeight: 600, color: 'var(--accent-red)',
        }}>
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* ── Users Table ──────────────────────────────────────── */}
      <div style={{
        flex: 1,
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(13,17,23,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 2.5fr 1fr 2fr 1.5fr 1.5fr',
          gap: '0',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          {['Username', 'Email', 'Role', 'Current Balance', 'Joined', 'Actions'].map((h) => (
            <div key={h} style={{
              fontSize: '10px', fontWeight: 800, color: '#475569',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Table Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <RefreshCw size={24} color="#3b82f6" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
              <p style={{ fontSize: '13px', color: '#64748b' }}>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Users size={32} color="#334155" style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '13px', color: '#64748b' }}>No users found</p>
            </div>
          ) : (
            users.map((user, idx) => (
              <div
                key={user._id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2.5fr 1fr 2fr 1.5fr 1.5fr',
                  gap: '0',
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  transition: 'background 0.15s',
                  alignItems: 'center',
                  background: user.fundRequested ? 'rgba(59,130,246,0.05)' : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = user.fundRequested ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = user.fundRequested ? 'rgba(59,130,246,0.05)' : 'transparent'}
              >
                {/* Username */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: user.role === 'admin' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                    border: `1px solid ${user.role === 'admin' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 800,
                    color: user.role === 'admin' ? '#f59e0b' : '#3b82f6',
                  }}>
                    {user.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
                      {user.username || '—'}
                    </span>
                    {user.fundRequested && (
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Pending Request
                      </span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={12} color="#475569" />
                  <span style={{
                    fontSize: '12px', color: '#94a3b8',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    {user.email || '—'}
                  </span>
                </div>

                {/* Role */}
                <div>
                  <span style={{
                    fontSize: '10px', fontWeight: 800,
                    padding: '3px 8px', borderRadius: '6px',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: user.role === 'admin' ? '#f59e0b' : '#3b82f6',
                    background: user.role === 'admin' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.08)',
                    border: `1px solid ${user.role === 'admin' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.15)'}`,
                  }}>
                    {user.role || 'user'}
                  </span>
                </div>

                {/* Balance */}
                <div className="mono" style={{
                  fontSize: '14px', fontWeight: 700,
                  color: 'var(--accent-green)',
                  letterSpacing: '-0.5px',
                }}>
                  ₹{(user.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>

                {/* Joined */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={11} color="#475569" />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {formatDate(user.createdAt)}
                  </span>
                </div>

                {/* Action */}
                <div>
                  <button
                    onClick={() => handleAddFunds(user._id, user.username)}
                    disabled={fundingUser === user._id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: user.fundRequested ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(5,150,105,0.2)',
                      background: fundingUser === user._id
                        ? 'rgba(5,150,105,0.15)'
                        : user.fundRequested ? 'rgba(59,130,246,0.15)' : 'rgba(5,150,105,0.06)',
                      color: user.fundRequested ? '#3b82f6' : 'var(--accent-green)',
                      fontSize: '11px', fontWeight: 800,
                      cursor: fundingUser === user._id ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      boxShadow: user.fundRequested ? '0 0 10px rgba(59,130,246,0.2)' : 'none',
                    }}
                    onMouseEnter={e => { 
                      if (fundingUser !== user._id) { 
                        e.currentTarget.style.background = user.fundRequested ? 'rgba(59,130,246,0.25)' : 'rgba(5,150,105,0.12)'; 
                        e.currentTarget.style.borderColor = user.fundRequested ? 'rgba(59,130,246,0.6)' : 'rgba(5,150,105,0.35)'; 
                      }
                    }}
                    onMouseLeave={e => { 
                      e.currentTarget.style.background = user.fundRequested ? 'rgba(59,130,246,0.15)' : 'rgba(5,150,105,0.06)'; 
                        e.currentTarget.style.borderColor = user.fundRequested ? 'rgba(59,130,246,0.4)' : 'rgba(5,150,105,0.2)'; 
                    }}
                  >
                    {fundingUser === user._id ? (
                      <>
                        <RefreshCw size={12} style={{ animation: 'spin 0.7s linear infinite' }} />
                        Adding...
                      </>
                    ) : (
                      <>
                        <IndianRupee size={12} />
                        {user.fundRequested ? 'Approve ₹1,00,000' : 'Grant ₹1,00,000'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
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
