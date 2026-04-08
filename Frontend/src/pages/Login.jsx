import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/userService';
import { getPasswordStrengthError, PASSWORD_POLICY_TEXT } from '../utils/passwordValidation';
import './Login.css';

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

    const passwordError = getPasswordStrengthError(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const result = await loginUser(formData);
      if (result.success) {
        // Use the login function from Auth context
        login(result.user, result.token);
        // Route student to student dashboard
        if (result.user?.role === 'student') {
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
          <h2>Welcome Back</h2>
          <p className="login-subtitle">Access your institutional workspace</p>

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
                <label htmlFor="password">Security Phrase</label>
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
              <p className="login-helper-text">{PASSWORD_POLICY_TEXT}</p>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Entering Workspace...' : 'Enter Workspace'}
            </button>
          </form>

          <div className="login-card-footer">
            <p>
              New to the institution? <Link to="/register">Request Enrollment</Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="login-bottom">
        <p>© 2024 EduConnect University. All Rights Reserved.</p>
        <nav aria-label="Legal links">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#accessibility">Accessibility</a>
          <a href="#contact">Contact Support</a>
        </nav>
      </footer>
    </div>
  );
};

export default Login;
