import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/userService';
import './Login.css';

const LOGIN_ART_IMAGE = 'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1400&q=80';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    setLoading(true);

    try {
      const result = await loginUser(formData);
      if (result.success) {
        // Use the login function from Auth context
        login(result.user, result.token);
        // Route student to student dashboard
        const role = String(result.user?.role || '').toLowerCase();
        if (role === 'student') {
          navigate('/student-dashboard');
        } else {
          navigate('/');
        }
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      setError(backendMessage || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-visual-panel" aria-label="Learning visual">
        <img src={LOGIN_ART_IMAGE} alt="Student studying with laptop" />
        <div className="login-visual-overlay" />
        <div className="login-visual-copy">
          <p className="visual-kicker">EDUCONNECT PORTAL</p>
          <h2>Learn smarter with one connected campus workspace.</h2>
          <p>Courses, quizzes, sessions, and community support in one place.</p>
        </div>
      </section>

      <section className="login-form-panel" aria-label="Login section">
        <header className="login-header">
          <div className="login-brand">
            <span className="logo-icon" aria-hidden="true">🎓</span>
            <span className="logo-text">EduConnect</span>
          </div>
          <nav className="login-header-links" aria-label="Utility links">
            <a href="#help">Help</a>
            <a href="#support">Support</a>
          </nav>
        </header>

        <main className="login-main">
          <section className="login-card" aria-label="Login form">
            <h1>Welcome Back</h1>
            <p className="login-subtitle">Sign in to continue your learning journey.</p>

            {message && <div className="login-success">{message}</div>}
            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="email">Email Address</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden="true">@</span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@email.com"
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <div className="login-label-row">
                  <label htmlFor="password">Password</label>
                  <Link to="/forgot-password" className="forgot-link">Forgot?</Link>
                </div>
                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden="true">🔒</span>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'Entering Workspace...' : 'Enter Workspace'}
              </button>
            </form>

            <div className="login-card-footer">
              <p>
                New to EduConnect? <Link to="/register">Create your account</Link>
              </p>
            </div>
          </section>
        </main>
      </section>
    </div>
  );
};

export default Login;
