import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { completeStripeCheckout } from '../services/commerceService';
import SessionCard from '../components/SessionCard';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import './SessionList.css';

export default function SessionList() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = String(user?.role || '').toLowerCase();
  const isAdminView = ['admin', 'teacher'].includes(role);
  const isStudent = role === 'student';
  const canCreateSession = role && role !== 'student';
  const [sessions, setSessions] = useState([]);
  const [bookedIds, setBookedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: 9 });
      if (search) params.append('search', search);
      if (subject) params.append('subject', subject);

      const { data } = await api.get(`/sessions?${params}`);
      setSessions(data.sessions);
      setTotalPages(data.pages);
    } catch (err) {
      setError('Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  }, [search, subject, page]);

  // Fetch student's bookings to mark booked sessions
  useEffect(() => {
    if (user?.role === 'student') {
      api.get('/bookings/my-bookings').then(({ data }) => {
        const ids = new Set(data.bookings.filter(b => b.status === 'confirmed').map(b => b.session?._id));
        setBookedIds(ids);
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');

    if (payment !== 'success' || !sessionId) {
      return;
    }

    const finalizeStripeCheckout = async () => {
      try {
        await completeStripeCheckout({ sessionId });
        await fetchSessions();
        alert('Payment verified. Premium Kuppi session unlocked. You can book it now.');
      } catch (err) {
        alert(err.response?.data?.message || 'Payment verification failed. Contact support if you were charged.');
      } finally {
        navigate('/sessions', { replace: true });
      }
    };

    finalizeStripeCheckout();
  }, [location.search, fetchSessions, navigate]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchSessions(); };
  const handleBookStatusChange = (sessionId, booked) => {
    setBookedIds((prev) => {
      const next = new Set(prev);
      if (booked) next.add(sessionId);
      else next.delete(sessionId);
      return next;
    });

    if (booked) {
      setSessions((prev) => prev.map((s) => (
        s._id === sessionId
          ? { ...s, participants: [...(s.participants || []), { _id: user?.id || 'current-user' }] }
          : s
      )));
    }
  };

  const totalVisibleSpots = sessions.reduce((sum, session) => {
    const left = (session.maxParticipants || 0) - (session.participants?.length || 0);
    return sum + Math.max(0, left);
  }, 0);

  const bookedVisibleCount = sessions.reduce((sum, session) => (
    bookedIds.has(session._id) ? sum + 1 : sum
  ), 0);

  return (
    <DashboardLayout activeSection="Kuppi Sessions" theme={isAdminView ? 'dark' : 'light'}>
      <div className={`container kuppi-page sessions-page ${isAdminView ? 'admin-sessions-theme' : ''}`}>
        <div className="kuppi-page-header sessions-page-header session-hero-card">
          <div className="session-hero-copy">
            <h1 className="kuppi-page-title">Kuppi Sessions</h1>
            <p className="kuppi-page-subtitle">Find and book expert-led study sessions</p>
            <div className="sessions-header-actions">
              <Link to="/vision-board" className="btn btn-secondary">Vision Board</Link>
              {canCreateSession && (
                <Link to="/create-session" className="btn btn-primary">+ Create Session</Link>
              )}
            </div>
          </div>

          <div className="sessions-hero-stats" aria-label="Session highlights">
            <div className="sessions-hero-stat">
              <div className="sessions-hero-stat-num">{sessions.length}</div>
              <div className="sessions-hero-stat-label">Visible Sessions</div>
            </div>
            <div className="sessions-hero-stat">
              <div className="sessions-hero-stat-num">{totalVisibleSpots}</div>
              <div className="sessions-hero-stat-label">Open Seats</div>
            </div>
            {isStudent && (
              <div className="sessions-hero-stat">
                <div className="sessions-hero-stat-num">{bookedVisibleCount}</div>
                <div className="sessions-hero-stat-label">Already Booked</div>
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter */}
        <form onSubmit={handleSearch} className="sessions-search-bar">
          <div className="sessions-search-field sessions-search-field-lg">
            <label className="sessions-search-label">Search Title</label>
            <input
              className="form-input"
              placeholder="Try integration, vectors, revision..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="sessions-search-field">
            <label className="sessions-search-label">Subject</label>
            <input
              className="form-input"
              placeholder="Maths, Physics, Chemistry"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>
          <div className="sessions-search-actions">
            <button type="submit" className="btn btn-primary">Search</button>
            {(search || subject) && (
              <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setSubject(''); setPage(1); }}>
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Sessions Grid */}
        {loading ? (
          <div className="sessions-loading-center">
            <div className="spinner spinner-dark sessions-loading-spinner" />
            <p className="sessions-loading-text">Loading sessions...</p>
          </div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state sessions-empty-state">
            <div className="empty-icon">📭</div>
            <h3>No sessions found</h3>
            <p>{search || subject ? 'Try different search terms.' : 'No upcoming sessions available yet.'}</p>
          </div>
        ) : (
          <>
            <div className="sessions-results-head">
              <p className="kuppi-results-count sessions-results-count">{sessions.length} session{sessions.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="grid grid-2 sessions-grid">
              {sessions.map(session => (
                <SessionCard
                  key={session._id}
                  session={session}
                  isBooked={bookedIds.has(session._id)}
                  userRole={user?.role}
                  onBookStatusChange={handleBookStatusChange}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="sessions-pagination">
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                <span className="sessions-pagination-label">Page {page} of {totalPages}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
