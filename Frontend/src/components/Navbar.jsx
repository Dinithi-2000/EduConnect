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

  const isStudent = String(user?.role || '').toLowerCase() === 'student';
  const dashboardPath = isStudent ? '/student-dashboard' : '/';
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={dashboardPath} className="navbar-logo">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">EduConnect</span>
        </Link>

        <div className="navbar-menu">
          <Link 
            to={dashboardPath}
            className={`navbar-link ${isActive('/') || isActive('/student-dashboard') ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to={isStudent ? '/student/quizzes' : '/quizzes'} 
            className={`navbar-link ${isActive('/quizzes') || isActive('/student/quizzes') ? 'active' : ''}`}
          >
            Quizzes
          </Link>
          <Link 
            to={isStudent ? '/student/progress' : '/progress'}
            className={`navbar-link ${isActive('/progress') || isActive('/student/progress') ? 'active' : ''}`}
          >
            Progress
          </Link>
          <Link 
            to="/about" 
            className={`navbar-link ${isActive('/about') ? 'active' : ''}`}
          >
            About
          </Link>
        </div>

        <div className="navbar-right">
          {isAuthenticated && user ? (
            <div className="user-menu-container">
              <button 
                className="user-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
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
                  <button 
                    className="dropdown-item logout"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="navbar-btn login-btn">
                Login
              </Link>
              <Link to="/register" className="navbar-btn register-btn">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

