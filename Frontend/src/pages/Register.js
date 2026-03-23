import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name, email: form.email, password: form.password, role: form.role
      });
      login(data.token, data.user);
      navigate('/sessions');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.branding}>
          <div style={styles.logo}>K</div>
          <h1 style={styles.brandTitle}>Join KuppiLMS</h1>
          <p style={styles.brandSubtitle}>Whether you're a student looking to learn or a tutor ready to teach — you're in the right place.</p>
          <div style={styles.roleCards}>
            <div style={{ ...styles.roleCard, ...(form.role === 'student' ? styles.roleCardActive : {}) }} onClick={() => setForm(p => ({ ...p, role: 'student' }))}>
              <span style={styles.roleEmoji}>📖</span>
              <div>
                <div style={styles.roleTitle}>Student</div>
                <div style={styles.roleDesc}>Browse and book sessions</div>
              </div>
              {form.role === 'student' && <span style={styles.roleCheck}>✓</span>}
            </div>
            <div style={{ ...styles.roleCard, ...(form.role === 'tutor' ? styles.roleCardActive : {}) }} onClick={() => setForm(p => ({ ...p, role: 'tutor' }))}>
              <span style={styles.roleEmoji}>🎓</span>
              <div>
                <div style={styles.roleTitle}>Tutor</div>
                <div style={styles.roleDesc}>Create and host sessions</div>
              </div>
              {form.role === 'tutor' && <span style={styles.roleCheck}>✓</span>}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.formBox}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Create account</h2>
            <p style={styles.formSubtitle}>Start your learning journey today</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Role selector (also in form for mobile) */}
            <div className="form-group">
              <label className="form-label">I am a</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['student', 'tutor'].map(r => (
                  <button key={r} type="button"
                    style={{ flex: 1, padding: '10px', border: `2px solid ${form.role === r ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', background: form.role === r ? 'var(--primary-light)' : 'transparent', color: form.role === r ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s', fontFamily: 'var(--font-body)' }}
                    onClick={() => setForm(p => ({ ...p, role: r }))}>
                    {r === 'student' ? '📖 Student' : '🎓 Tutor'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input name="name" className="form-input" value={form.name} onChange={handleChange} placeholder="Your full name" required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input name="email" type="email" className="form-input" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" className="form-input" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input name="confirmPassword" type="password" className="form-input" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat your password" required />
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <><span className="spinner" />Creating account…</> : 'Create Account'}
            </button>
          </form>

          <p style={styles.switchLink}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh' },
  left: { flex: 1, background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  branding: { maxWidth: 400 },
  logo: { width: 56, height: 56, background: 'rgba(255,255,255,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 24 },
  brandTitle: { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 12 },
  brandSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 },
  roleCards: { display: 'flex', flexDirection: 'column', gap: 12 },
  roleCard: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'rgba(255,255,255,0.1)', borderRadius: 12, cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.15s' },
  roleCardActive: { background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.5)' },
  roleEmoji: { fontSize: 24 },
  roleTitle: { color: '#fff', fontWeight: 700, fontSize: 15 },
  roleDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  roleCheck: { marginLeft: 'auto', color: '#fff', fontWeight: 900, fontSize: 16 },
  right: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, background: 'var(--bg)', overflowY: 'auto' },
  formBox: { width: '100%', maxWidth: 420 },
  formHeader: { marginBottom: 28 },
  formTitle: { fontSize: 28, fontWeight: 800 },
  formSubtitle: { color: 'var(--text-secondary)', marginTop: 6 },
  switchLink: { textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' },
};
