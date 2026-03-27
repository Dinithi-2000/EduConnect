import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/userService';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const result = await registerUser(registerData);
      
      if (result.success) {
        // Use the login function from Auth context
        login(result.user, result.token);
        // Route student to student dashboard
        if (result.user?.role === 'student' || registerData.role === 'student') {
          navigate('/student-dashboard');
        } else {
          navigate('/');
        }
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <section className="register-left-shell">
        <div className="register-wrapper">
          <header className="register-header">
            <div className="register-brand" aria-label="EduConnect">
              <span className="logo-icon" aria-hidden="true">🎓</span>
              <span className="logo-text">EduConnect</span>
            </div>
            <nav className="register-header-links" aria-label="Utility links">
              <a href="#help">Help</a>
              <a href="#support">Support</a>
            </nav>
          </header>

          <div className="register-card">
            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="register-form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true">👤</span>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Dr. Julian Sterling"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true">✉</span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@educonnect.edu"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <div className="auth-input-wrap select-wrap">
                  <span className="auth-input-icon" aria-hidden="true">⚖</span>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>
              </div>

              <div className="password-row">
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">🔒</span>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">🔐</span>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="auth-footer">
              <p>Already have an account? <Link to="/login">Sign In</Link></p>
            </div>
          </div>

          <div className="register-bottom">
            <div>
              <span>Privacy Policy</span>
              <span>Terms</span>
            </div>
            <p>Secure Gateway</p>
          </div>
        </div>
      </section>

      <aside className="register-right-panel" aria-label="Marketing panel">
        <div className="right-panel-content">
          <div className="right-kicker"></div>
          <h2>Elevating Global Learning Standards.</h2>
          <p>
            Join thousands of institutions managing their academic ecosystem with EduConnect Scholar.
          </p>
          <div className="right-visual-card"></div>
          <div className="right-fade-strip"></div>
          <div className="right-fade-strip secondary"></div>
          <div className="right-fade-strip tertiary"></div>
        </div>
      </aside>
    </div>
  );
};

export default Register;
