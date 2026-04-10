import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationService';
import AIChatWidget from './AIChatWidget';
import './DashboardLayout.css';

const DashboardLayout = ({ children, activeSection = 'Quizzes', theme = 'dark' }) => {
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifPanelRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const isAdminView = ['admin', 'teacher'].includes(user?.role);
  const isTutorOnlyView = user?.role === 'tutor';
  const dashboardPath = role === 'student' ? '/student-dashboard' : '/';
  const displayName = user?.name || 'User';
  const profileLabel = isAdminView ? 'Administrator' : displayName;
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=fff`;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadNotifications = useCallback(async () => {
    if (!user?._id && !user?.id) return;

    try {
      setNotifLoading(true);
      const response = await getNotifications();
      setNotifications(response?.notifications || []);
      setUnreadCount(Number(response?.unreadCount || 0));
    } catch {
      // Keep UI non-blocking if notification endpoint is unavailable.
    } finally {
      setNotifLoading(false);
    }
  }, [user?._id, user?.id]);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 20000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!notifPanelRef.current) return;
      if (!notifPanelRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotifications = async () => {
    const nextOpen = !notifOpen;
    setNotifOpen(nextOpen);
    if (nextOpen) {
      await loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore UX-only action failures.
    }
  };

  const handleMarkOneRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) => prev.map((item) => (
        item._id === notificationId ? { ...item, isRead: true } : item
      )));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore UX-only action failures.
    }
  };

  const navItems = isAdminView
    ? [
        { icon: '📊', label: 'Dashboard', path: '/' },
        { icon: '📚', label: 'Course & Content Management', path: '/courses' },
        { icon: '🧑‍🎓', label: 'Student Management', path: '/student-management' },
        { icon: '📝', label: 'Quiz & Mock Exam Management', path: '/quizzes' },
        { icon: '💳', label: 'Premium & Payment Management', path: '/premium-management' },
        { icon: '🎥', label: 'Kuppi Session Booking Management', path: '/sessions' },
        { icon: '👥', label: 'Community Management', path: '/community' },
        { icon: '📈', label: 'Reports', path: '/progress' }
      ]
    : [
      { icon: '📊', label: 'Dashboard', path: dashboardPath },
        { icon: '📚', label: 'My Courses', path: '/student/courses' },
        { icon: '�', label: 'Quizzes', path: '/student/quizzes' },
        { icon: '�', label: 'Premium', path: '/student/premium' },
        { icon: '🎥', label: 'Kuppi Sessions', path: isTutorOnlyView ? '/my-sessions' : '/sessions' },
        { icon: '�', label: 'Community', path: '/student/community' },
        { icon: '📈', label: 'Progress', path: '/student/progress' }
      ];

  const getActiveLabel = () => {
    const match = navItems.find(item => location.pathname.startsWith(item.path) && item.path !== '/');
    if (match) return match.label;
    if (location.pathname === '/' || location.pathname === '/student-dashboard') return 'Dashboard';
    return activeSection;
  };

  return (
    <div className={`dashboard-layout ${isAdminView ? 'admin-shell' : ''} ${theme === 'light' ? 'light-shell' : ''}`}>
      {/* Sidebar */}
      <aside className="layout-sidebar">
        <div className="sidebar-header">
          <div className="logo" onClick={() => navigate(dashboardPath)} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">🎓</span>
            <div className="logo-text-block">
              <span className="logo-text">EduConnect</span>
              {isAdminView && <small>Admin Terminal</small>}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <div
              key={item.label}
              className={`nav-item ${getActiveLabel() === item.label ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </div>
          ))}

          {!isAdminView && (
            <div className="nav-item" onClick={() => setChatOpenSignal((prev) => prev + 1)}>
              <span className="nav-icon">🤖</span>
              <span className="nav-label">AI Chatbot</span>
            </div>
          )}
          <div
            className={`nav-item nav-utility ${location.pathname.startsWith('/settings') ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </div>
          <div className="nav-item nav-logout" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Logout</span>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <main className="layout-main">
        {/* Top Header */}
        <header className="layout-header">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search resources..." className="search-input" />
          </div>
          <div className="header-actions">
            <div className="notification-wrap" ref={notifPanelRef}>
              <button className="icon-btn notification-btn" onClick={handleToggleNotifications}>
                🔔
                {unreadCount > 0 ? <span className="notification-badge">{Math.min(unreadCount, 99)}</span> : null}
              </button>

              {notifOpen ? (
                <div className="notification-panel">
                  <div className="notification-panel-head">
                    <strong>Notifications</strong>
                    <button type="button" onClick={handleMarkAllRead}>Mark all read</button>
                  </div>

                  {notifLoading ? <p className="notification-empty">Loading...</p> : null}

                  {!notifLoading && notifications.length === 0 ? (
                    <p className="notification-empty">No notifications yet.</p>
                  ) : null}

                  {!notifLoading && notifications.length > 0 ? (
                    <div className="notification-list">
                      {notifications.slice(0, 8).map((item) => (
                        <button
                          type="button"
                          key={item._id}
                          className={`notification-item ${item.isRead ? 'read' : 'unread'}`}
                          onClick={() => handleMarkOneRead(item._id)}
                        >
                          <strong>{item.title}</strong>
                          <span>{item.message}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button className="icon-btn">⚙️</button>
            <div className="user-profile-wrap">
            <div
              className="user-profile"
              onClick={() => navigate('/profile')}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate('/profile');
                }
              }}
            >
              <img
                src={avatarUrl}
                alt={displayName}
                className="user-avatar"
              />
              <span className="user-name">{profileLabel}</span>
            </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="layout-content">
          {children}
        </div>
      </main>

      {!isAdminView && (
        <AIChatWidget
          darkMode={false}
          studentId={user?._id || user?.id || 'guest-student'}
          context={{ currentCourse: activeSection }}
          openSignal={chatOpenSignal}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
