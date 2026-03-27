import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/userService';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordReset(email.trim());
      setSuccess(
        result?.message ||
          'If this email is registered, a reset link has been sent to your inbox.'
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Password reset is not available right now. Please contact support.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <header className="forgot-header">
        <div className="forgot-brand">
          <span className="logo-icon" aria-hidden="true">🎓</span>
          <span className="logo-text">EduConnect</span>
        </div>
        <nav className="forgot-header-links" aria-label="Utility links">
          <a href="#help">Help</a>
          <a href="#support">Support</a>
        </nav>
      </header>

      <main className="forgot-main">
        <section className="forgot-card" aria-label="Forgot password form">
          <h2>Forgot Password</h2>
          <p className="forgot-subtitle">Enter your email to request a secure reset link.</p>

          {error && <div className="forgot-error">{error}</div>}
          {success && <div className="forgot-success">{success}</div>}

          <form onSubmit={handleSubmit} className="forgot-form">
            <div className="forgot-field">
              <label htmlFor="email">Email Address</label>
              <div className="forgot-input-wrap">
                <span className="forgot-input-icon" aria-hidden="true">@</span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  required
                />
              </div>
            </div>

            <button type="submit" className="forgot-submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="forgot-card-footer">
            <p>
              Remember your password? <Link to="/login">Back to Login</Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="forgot-bottom">
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

export default ForgotPassword;
