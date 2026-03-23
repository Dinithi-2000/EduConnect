import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      navigate('/sessions');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.branding}>
          <div style={styles.logo}>K</div>
          <h1 style={styles.brandTitle}>KuppiLMS</h1>
          <p style={styles.brandSubtitle}>Your gateway to smarter learning. Connect with tutors, book sessions, and level up.</p>
          <div style={styles.features}>
            {['📚 Browse Kuppi Sessions', '🎓 Expert Tutors', '⏰ Flexible Scheduling', '📧 Instant Confirmation'].map(f => (
              <div key={f} style={styles.featureItem}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.formBox}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Welcome back</h2>
            <p style={styles.formSubtitle}>Sign in to your account</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input name="email" type="email" className="form-input" value={form.email} onChange={handleChange} placeholder="you@example.com" required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" className="form-input" value={form.password} onChange={handleChange} placeholder="Your password" required />
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><span className="spinner" />Signing in…</> : 'Sign In'}
            </button>
          </form>

          <p style={styles.switchLink}>
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh' },
  left: { flex: 1, background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  branding: { maxWidth: 400 },
  logo: { width: 56, height: 56, background: 'rgba(255,255,255,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 24, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' },
  brandTitle: { fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 12 },
  brandSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 1.6, marginBottom: 32 },
  features: { display: 'flex', flexDirection: 'column', gap: 12 },
  featureItem: { color: 'rgba(255,255,255,0.9)', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 },
  right: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, background: 'var(--bg)' },
  formBox: { width: '100%', maxWidth: 420 },
  formHeader: { marginBottom: 32 },
  formTitle: { fontSize: 28, fontWeight: 800 },
  formSubtitle: { color: 'var(--text-secondary)', marginTop: 6 },
  switchLink: { textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' },
};
