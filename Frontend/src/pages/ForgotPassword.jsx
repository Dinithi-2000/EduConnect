import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/userService';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [lastRequestedEmail, setLastRequestedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const intervalId = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [cooldown]);

  const requestResetLink = async (targetEmail) => {
    setError('');
    setSuccess('');
    setResetUrl('');
    setLoading(true);

    try {
      const result = await forgotPassword(targetEmail);
      setSuccess(result.message || 'If an account exists, a reset link has been sent.');
      if (result.resetUrl) {
        setResetUrl(result.resetUrl);
      }
      setLastRequestedEmail(targetEmail);
      setCooldown(30);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await requestResetLink(email);
  };

  const handleResend = async () => {
    if (!lastRequestedEmail || cooldown > 0 || loading) return;
    await requestResetLink(lastRequestedEmail);
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-logo">
          <span className="logo-icon">🎓</span>
          <h1>EduConnect</h1>
        </div>

        <div className="auth-card">
          <h2>Forgot Password</h2>
          <p className="auth-subtitle">Enter your email to receive a password reset link</p>

          {error && <div className="auth-error">{error}</div>}
          {success && (
            <div className="alert alert-success">
              <div>{success}</div>
              {lastRequestedEmail && (
                <div style={{ marginTop: 6, fontSize: 13 }}>
                  Sent to: {lastRequestedEmail}
                </div>
              )}
              {resetUrl && (
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  Dev reset link: <a href={resetUrl}>{resetUrl}</a>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Remembered your password? <Link to="/login">Go to login</Link></p>
            {!!lastRequestedEmail && (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="auth-btn"
                  onClick={handleResend}
                  disabled={loading || cooldown > 0}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Reset Link'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
