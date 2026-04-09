import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BellIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user) fetchNotifications();
    const interval = setInterval(() => { if (user) fetchNotifications(); }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications.slice(0, 8));
      setUnreadCount(data.unreadCount);
    } catch {}
  };

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path) => location.pathname === path;

  const navLinks = user?.role === 'tutor'
    ? [{ to: '/sessions', label: 'Browse' }, { to: '/my-sessions', label: 'My Sessions' }, { to: '/create-session', label: '+ New Session' }]
    : [{ to: '/sessions', label: 'Browse Sessions' }, { to: '/my-sessions', label: 'My Bookings' }];

  const typeIcons = { booking_confirmed: '✅', student_booked: '🎓', session_reminder: '⏰', session_cancelled: '❌' };

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <Link to="/sessions" style={styles.logo}>
          <span style={styles.logoIcon}>K</span>
          <span>Kuppi<span style={{ color: 'var(--primary)' }}>LMS</span></span>
        </Link>

        {/* Desktop links */}
        <div style={styles.links}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={{ ...styles.link, ...(isActive(to) ? styles.linkActive : {}) }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div style={styles.right}>
          {/* Notification Bell */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button style={styles.iconBtn} onClick={() => setShowDropdown(v => !v)} aria-label="Notifications">
              <BellIcon />
              {unreadCount > 0 && <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {showDropdown && (
              <div style={styles.notifDropdown}>
                <div style={styles.notifHeader}>
                  <span style={{ fontWeight: 700 }}>Notifications</span>
                  {unreadCount > 0 && <button style={styles.markAllBtn} onClick={handleMarkAllRead}>Mark all read</button>}
                </div>
                {notifications.length === 0 ? (
                  <div style={styles.notifEmpty}>No notifications yet</div>
                ) : (
                  notifications.map(n => (
                    <div key={n._id} style={{ ...styles.notifItem, background: n.isRead ? 'transparent' : '#eff6ff' }}
                      onClick={() => !n.isRead && handleMarkRead(n._id)}>
                      <span style={{ fontSize: 18 }}>{typeIcons[n.type] || '🔔'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(n.createdAt).toLocaleDateString()}</div>
                      </div>
                      {!n.isRead && <div style={{ width: 8, height: 8, background: 'var(--primary)', borderRadius: '50%', flexShrink: 0 }} />}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Profile avatar */}
          <Link to="/profile" style={styles.avatar}>
            {user?.profilePicture
              ? <img src={`http://localhost:5000${user.profilePicture}`} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{user?.name?.charAt(0).toUpperCase()}</span>
            }
          </Link>

          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', height: 68 },
  inner: { maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', gap: 24 },
  logo: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 },
  logoIcon: { width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18 },
  links: { display: 'flex', alignItems: 'center', gap: 4, flex: 1 },
  link: { padding: '7px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'all 0.15s' },
  linkActive: { background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 },
  right: { display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', color: 'var(--text-secondary)', transition: 'all 0.15s' },
  badge: { position: 'absolute', top: -6, right: -6, background: 'var(--danger)', color: '#fff', borderRadius: 100, fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #fff' },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, textDecoration: 'none' },
  notifDropdown: { position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 340, background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', zIndex: 2000, overflow: 'hidden' },
  notifHeader: { padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  notifEmpty: { padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 },
  notifItem: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' },
  markAllBtn: { background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', fontWeight: 500 },
};
