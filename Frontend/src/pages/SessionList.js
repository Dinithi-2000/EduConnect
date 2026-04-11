import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { completeStripeCheckout } from '../services/commerceService';
import SessionCard from '../components/SessionCard';
import DashboardLayout from '../components/DashboardLayout';
import AIChatWidget from '../components/AIChatWidget';
import { useAuth } from '../context/AuthContext';
import './StudentDashboard.css';
import './SessionList.css';

const THEME_STORAGE_KEY = 'student-theme-mode';

export default function SessionList() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = String(user?.role || '').toLowerCase();
  const isAdminView = ['admin', 'teacher'].includes(role);
  const isStudent = role === 'student';
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const canCreateSession = role && role !== 'student';
  const [sessions, setSessions] = useState([]);
  const [bookedIds, setBookedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [themeMode, setThemeMode] = useState(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === 'dark' ? 'dark' : 'light';
  });

  const isDarkMode = themeMode === 'dark';

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
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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

  const displayName = user?.name || 'Student';
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleStudentLogout = () => {
    logout();
    navigate('/login');
  };

  const studentSidebarItems = [
    { icon: '▦', label: 'Dashboard', route: '/student-dashboard' },
    { icon: '🎓', label: 'My Courses', route: '/student/my-courses' },
    { icon: '📚', label: 'Course & Contents', route: '/student/courses' },
    { icon: '📝', label: 'Quiz & Mock Exams', route: '/student/quizzes' },
    { icon: '🎥', label: 'Kuppi Sessions', route: '/sessions', active: true },
    { icon: '💬', label: 'Community Board', route: '/student/community' },
    { icon: '📈', label: 'Progress Analytics', route: '/student/progress' },
    { icon: '👑', label: 'Premium', route: '/student/premium' },
    { icon: '🤖', label: 'AI Chatbot', action: () => setChatOpenSignal((prev) => prev + 1) },
    { icon: '⚙', label: 'Settings', route: '/settings' }
  ];

  const handleStudentSidebarAction = (item) => {
    if (item.action) {
      item.action();
      return;
    }
    navigate(item.route);
  };

  const sessionContent = (
    <div className={`container kuppi-page sessions-page ${isAdminView ? 'admin-sessions-theme' : ''}`}>
      {isStudent ? (
        <div className="kuppi-page-header sessions-page-header session-hero-card session-hero-combined">
          <div className="session-hero-main">
            <div className="session-hero-copy">
              <h1 className="kuppi-page-title">Kuppi Sessions</h1>
              <p className="kuppi-page-subtitle">Find and book expert-led study sessions</p>
            </div>
          </div>

          <div className="session-hero-side">
            <div className="sessions-hero-right">
              <div className="sessions-hero-stats sessions-hero-stats-three" aria-label="Session highlights">
                <div className="sessions-hero-stat">
                  <div className="sessions-hero-stat-num">{sessions.length}</div>
                  <div className="sessions-hero-stat-label">Visible Sessions</div>
                </div>
                <div className="sessions-hero-stat">
                  <div className="sessions-hero-stat-num">{totalVisibleSpots}</div>
                  <div className="sessions-hero-stat-label">Open Seats</div>
                </div>
                <div className="sessions-hero-stat">
                  <div className="sessions-hero-stat-num">{bookedVisibleCount}</div>
                  <div className="sessions-hero-stat-label">Already Booked</div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} className="sessions-search-bar sessions-search-bar-embedded">
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
        </div>
      ) : (
        <>
          <div className="kuppi-page-header sessions-page-header session-hero-card">
            <div className="session-hero-copy">
              <h1 className="kuppi-page-title">Kuppi Sessions</h1>
              <p className="kuppi-page-subtitle">Find and book expert-led study sessions</p>
            </div>

            <div className="sessions-hero-right">
              <div
                className={`sessions-hero-stats ${
                  isStudent
                    ? 'sessions-hero-stats-three'
                    : canCreateSession
                      ? 'sessions-hero-stats-with-create'
                      : 'sessions-hero-stats-two'
                }`}
                aria-label="Session highlights"
              >
                {canCreateSession && (
                  <Link to="/create-session" className="btn btn-primary sessions-hero-create-btn-inline">+ Create Session</Link>
                )}
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
          </div>

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
        </>
      )}

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
          <div className="sessions-grid">
            {sessions.map((session, sessionIndex) => (
              <SessionCard
                key={session._id}
                session={session}
                listIndex={sessionIndex}
                isBooked={bookedIds.has(session._id)}
                userRole={user?.role}
                onBookStatusChange={handleBookStatusChange}
              />
            ))}
          </div>

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
  );

  if (isStudent) {
    return (
      <div className={`student-v2-shell ${isDarkMode ? 'theme-dark' : ''}`}>
        <aside className="student-v2-sidebar">
          <div className="student-v2-brand">
            <span className="brand-mark">E</span>
            <div className="brand-copy">
              <h1>EDUCONNECT</h1>
              <small>Academic Portal</small>
            </div>
          </div>

          <nav className="student-v2-nav" aria-label="Student navigation">
            {studentSidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`student-v2-nav-item ${item.active ? 'active' : ''}`}
                onClick={() => handleStudentSidebarAction(item)}
              >
                <span className="icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="student-v2-upgrade">
            <p>Unlock all features</p>
            <h3>Upgrade to Pro</h3>
            <button type="button" onClick={() => navigate('/student/premium')}>Upgrade Now</button>
          </div>

          <button type="button" className="student-v2-logout" onClick={handleStudentLogout}>Logout</button>
        </aside>

        <main className="student-v2-main">
          <header className="student-v2-topbar">
            <div className="student-v2-search-wrap">
              <span aria-hidden="true">⌕</span>
              <input
                type="text"
                placeholder="Search courses, sessions, materials..."
                aria-label="Search courses, sessions, materials"
              />
            </div>

            <div className="student-v2-tools">
              <button
                type="button"
                className="ghost-icon"
                aria-label="Theme"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={handleToggleTheme}
              >
                {isDarkMode ? '☀' : '◐'}
              </button>
              <button type="button" className="premium-pill" onClick={() => navigate('/student/premium')}>
                <span aria-hidden="true">👑</span>
                Premium
              </button>
              <div className="student-v2-profile-chip">
                <div className="student-v2-profile-text">
                  <strong>{displayName}</strong>
                  <small>{user?.email || 'Student account'}</small>
                </div>
                <div className="student-v2-profile-avatar">{initials}</div>
              </div>
            </div>
          </header>

          {sessionContent}

          <AIChatWidget
            studentId={user?._id || user?.id || 'guest-student'}
            context={{ page: 'student-sessions', user: { id: user?._id, name: user?.name, role: user?.role } }}
            openSignal={chatOpenSignal}
          />
        </main>
      </div>
    );
  }

  return (
    <DashboardLayout activeSection="Kuppi Sessions" theme={isAdminView ? 'dark' : 'light'}>
      {sessionContent}
    </DashboardLayout>
  );
}
