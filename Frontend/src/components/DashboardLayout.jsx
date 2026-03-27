import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AIChatWidget from './AIChatWidget';
import './DashboardLayout.css';

const DashboardLayout = ({ children, activeSection = 'Quizzes', theme = 'dark' }) => {
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const isAdminView = ['admin', 'teacher'].includes(user?.role);
  const dashboardPath = isAdminView ? '/' : '/student-dashboard';
  const displayName = user?.name || 'User';
  const profileLabel = isAdminView ? 'Administrator' : displayName;
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=fff`;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = isAdminView
    ? [
        { icon: '📊', label: 'Dashboard', path: '/' },
        { icon: '📚', label: 'Course & Content Management', path: '/courses' },
        { icon: '🧑‍🎓', label: 'Student Management', path: '/student-management' },
        { icon: '📝', label: 'Quiz & Mock Exam Management', path: '/quizzes' },
        { icon: '💳', label: 'Premium & Payment Management', path: '/premium-management' },
        { icon: '🎥', label: 'Kuppi Session Booking Management', path: '/kuppi' },
        { icon: '👥', label: 'Community Management', path: '/community' },
        { icon: '📈', label: 'Reports', path: '/progress' }
      ]
    : [
        { icon: '📊', label: 'Dashboard', path: '/student-dashboard' },
        { icon: '📚', label: 'My Courses', path: '/student/courses' },
        { icon: '�', label: 'Quizzes', path: '/student/quizzes' },
        { icon: '�', label: 'Premium', path: '/student/premium' },
        { icon: '🎥', label: 'Kuppi Sessions', path: '/kuppi' },
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
            <button className="icon-btn notification-btn">
              🔔<span className="notification-badge"></span>
            </button>
            <button className="icon-btn">⚙️</button>
            <div className="user-profile-wrap">
            <div
              className={`user-profile ${profileMenuOpen ? 'open' : ''}`}
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setProfileMenuOpen((prev) => !prev);
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
            {isAdminView && profileMenuOpen && (
              <div className="profile-menu">
                <button
                  className="profile-menu-btn logout"
                  onClick={(event) => {
                    event.stopPropagation();
                    setProfileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
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
