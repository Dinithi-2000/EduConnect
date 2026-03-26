import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dashboardPath = user?.role === 'student' ? '/student-dashboard' : '/';
  const isActive = (path) => location.pathname === path;
  const isTutor = user?.role === 'tutor' || user?.role === 'teacher' || user?.role === 'admin';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={dashboardPath} className="navbar-logo">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">EduConnect</span>
        </Link>

        <div className="navbar-menu">
          <Link to={dashboardPath} className={`navbar-link ${isActive(dashboardPath) ? 'active' : ''}`}>Dashboard</Link>
          <Link to="/quizzes" className={`navbar-link ${isActive('/quizzes') ? 'active' : ''}`}>Quizzes</Link>
          <Link to="/sessions" className={`navbar-link ${isActive('/sessions') ? 'active' : ''}`}>Kuppi Sessions</Link>
          <Link to="/my-sessions" className={`navbar-link ${isActive('/my-sessions') ? 'active' : ''}`}>My Sessions</Link>
          {isTutor && (
            <Link to="/create-session" className={`navbar-link ${isActive('/create-session') ? 'active' : ''}`}>+ Create Session</Link>
          )}
          <Link to="/vision-board" className={`navbar-link ${isActive('/vision-board') ? 'active' : ''}`}>Vision Board</Link>
          <Link to="/progress" className={`navbar-link ${isActive('/progress') ? 'active' : ''}`}>Progress</Link>
          <Link to="/about" className={`navbar-link ${isActive('/about') ? 'active' : ''}`}>About</Link>
        </div>

        <div className="navbar-right">
          {isAuthenticated && user ? (
            <div className="user-menu-container">
              <button className="user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                <span className="user-avatar">{user.name?.charAt(0).toUpperCase()}</span>
                <span className="user-name">{user.name}</span>
                <span className="dropdown-icon">▼</span>
              </button>
              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <p className="user-email">{user.email}</p>
                    <p className="user-role">{user.role}</p>
                  </div>
                  <hr />
                  <Link to="/profile" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    My Profile
                  </Link>
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="navbar-btn login-btn">Login</Link>
              <Link to="/register" className="navbar-btn register-btn">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;