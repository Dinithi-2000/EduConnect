import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AIChatWidget from './AIChatWidget';
import './DashboardLayout.css';

const DashboardLayout = ({ children, activeSection = 'Quizzes' }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const isAdminView = ['admin', 'teacher'].includes(user?.role);
  const displayName = user?.name || 'User';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=fff`;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: '📊', label: 'Dashboard', path: '/' },
    { icon: '📚', label: 'My Courses', path: '/courses' },
    { icon: '📝', label: 'Quizzes', path: '/quizzes' },
    { icon: '👑', label: 'Premium', path: '/premium' },
    { icon: '🎥', label: 'Kuppi Sessions', path: '/kuppi' },
    { icon: '👥', label: 'Community', path: '/community' },
    { icon: '📈', label: isAdminView ? 'Reports' : 'Analytics', path: '/progress' }
  ];

  const getActiveLabel = () => {
    const match = navItems.find(item => location.pathname.startsWith(item.path) && item.path !== '/');
    if (match) return match.label;
    if (location.pathname === '/') return 'Dashboard';
    return activeSection;
  };

  return (
    <div className={`dashboard-layout ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className="layout-sidebar">
        <div className="sidebar-header">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">🎓</span>
            <span className="logo-text">EduConnect</span>
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
        </nav>

        <div className="sidebar-footer">
          <div className="upgrade-section" onClick={() => navigate('/premium')} style={{ cursor: 'pointer' }}>
            <span className="upgrade-icon">👑</span>
            <span className="upgrade-text">Premium</span>
          </div>
          <div className="nav-item" onClick={() => setChatOpenSignal((prev) => prev + 1)}>
            <span className="nav-icon">🤖</span>
            <span className="nav-label">AI Chatbot</span>
          </div>
          <div className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </div>
          <div className="nav-item" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Logout</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="layout-main">
        {/* Top Header */}
        <header className="layout-header">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search quizzes, topics..." className="search-input" />
          </div>
          <div className="header-actions">
            <button className="icon-btn notification-btn">
              🔔<span className="notification-badge"></span>
            </button>
            <button className="icon-btn theme-toggle" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="user-profile">
              <img
                src={avatarUrl}
                alt={displayName}
                className="user-avatar"
              />
              <span className="user-name">{displayName}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="layout-content">
          {children}
        </div>
      </main>

      <AIChatWidget
        darkMode={darkMode}
        studentId={user?._id || user?.id || 'guest-student'}
        context={{ currentCourse: activeSection }}
        openSignal={chatOpenSignal}
      />
    </div>
  );
};

export default DashboardLayout;
