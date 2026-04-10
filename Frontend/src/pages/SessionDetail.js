import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import { completeStripeCheckout } from '../services/commerceService';
import { useAuth } from '../context/AuthContext';
import BookingButton from '../components/BookingButton';
import DashboardLayout from '../components/DashboardLayout';
import AIChatWidget from '../components/AIChatWidget';
import './StudentDashboard.css';

const API_BASE_URL = 'http://localhost:5000';

export default function SessionDetail() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const location = useLocation();
  const role = String(user?.role || '').toLowerCase();
  const isAdminView = ['admin', 'teacher'].includes(role);
  const isStudent = role === 'student';
  const currentUserId = user?.id || user?._id;
  const navigate = useNavigate();
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [session, setSession] = useState(null);
  const [isBooked, setIsBooked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await api.get(`/sessions/${id}`);
        setSession(data.session);
        setIsBooked(data.isBooked);
      } catch {
        setError('Session not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [id]);

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
        const { data } = await api.get(`/sessions/${id}`);
        setSession(data.session);
        setIsBooked(data.isBooked);
        alert('Payment verified. Premium Kuppi session unlocked. You can now book it.');
      } catch (err) {
        alert(err.response?.data?.message || 'Payment verification failed. Contact support if you were charged.');
      } finally {
        navigate(`/sessions/${id}`, { replace: true });
      }
    };

    finalizeStripeCheckout();
  }, [location.search, id, navigate]);

  const handleBookingChange = (booked) => {
    setIsBooked(booked);
    setSession(prev => ({
      ...prev,
      participants: booked
        ? [...(prev.participants || []), { _id: currentUserId }]
        : (prev.participants || []).filter(p => p._id !== currentUserId),
    }));
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this session? All bookings will be removed.')) return;
    setDeleting(true);
    try {
      await api.delete(`/sessions/${id}`);
      navigate('/my-sessions');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete session.');
      setDeleting(false);
    }
  };

  const displayName = user?.name || 'Student';
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

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

  const handleStudentLogout = () => {
    logout();
    navigate('/login');
  };

  const renderPageShell = (content) => {
    if (!isStudent) {
      return (
        <DashboardLayout activeSection="Kuppi Sessions" theme={isAdminView ? 'dark' : 'light'}>
          {content}
        </DashboardLayout>
      );
    }

    return (
      <div className="student-v2-shell">
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
              <button type="button" className="ghost-icon" aria-label="Notifications">🔔</button>
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

          {content}

          <AIChatWidget
            studentId={user?._id || user?.id || 'guest-student'}
            context={{ page: 'student-session-detail', user: { id: user?._id, name: user?.name, role: user?.role } }}
            openSignal={chatOpenSignal}
          />
        </main>
      </div>
    );
  };

  if (loading) return renderPageShell(
      <div className={`container kuppi-page kuppi-page-space-top session-detail-page ${isAdminView ? 'admin-session-detail-theme' : ''}`}>
        <div className="session-detail-loading">
        <div className="spinner spinner-dark session-detail-loading-spinner" />
        </div>
      </div>
  );

  if (error) return renderPageShell(
      <div className={`container kuppi-page kuppi-page-space-top session-detail-page ${isAdminView ? 'admin-session-detail-theme' : ''}`}>
        <div className="alert alert-error">{error}</div>
        <Link to="/sessions" className="btn btn-secondary">← Back to Sessions</Link>
      </div>
  );

  const sessionDate = new Date(session.date);
  const spotsLeft = session.maxParticipants - (session.participants?.length || 0);
  const canManageSession = user?.role === 'tutor' || user?.role === 'teacher' || user?.role === 'admin';
  const isTutor = canManageSession && session.tutor?._id === currentUserId;
  const material = session.lectureMaterial;
  const materialRelativePath = material?.path
    || (material?.filename ? `/uploads/materials/${material.filename}` : '');
  const materialUrl = materialRelativePath
    ? `${API_BASE_URL}${materialRelativePath.startsWith('/') ? materialRelativePath : `/${materialRelativePath}`}`
    : '';
  const hasMaterial = Boolean(material?.path || material?.filename || material?.originalName);

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return renderPageShell(
      <div className={`container kuppi-page kuppi-page-space session-detail-page ${isAdminView ? 'admin-session-detail-theme' : ''}`}>
        <Link to="/sessions" className="session-back-link">
          ← Back to Sessions
        </Link>

      <div className="session-detail-layout">
        <div className="session-detail-main">
          <div className="card card-body session-detail-primary-card">
            <div className="session-detail-head">
              <div>
                <span className="session-subject-badge">{session.subject}</span>
                <h1 className="session-title">{session.title}</h1>
              </div>
              <span className={`badge session-status-badge ${session.status === 'upcoming' ? 'badge-green' : 'badge-yellow'}`}>
                {session.status}
              </span>
            </div>

            {session.description && (
              <p className="session-description">{session.description}</p>
            )}

            <div className="session-details-grid">
              {[
                { icon: '📅', label: 'Date', value: sessionDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                { icon: '🕐', label: 'Time', value: sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
                { icon: '⏱', label: 'Duration', value: `${session.duration} minutes` },
                {
                  icon: session.isPremium ? '💎' : '🆓',
                  label: 'Kuppi Type',
                  value: session.isPremium
                    ? `Premium (${(session.premiumCurrency || 'USD').toUpperCase()} ${Number(session.premiumPrice || 0).toFixed(2)})`
                    : 'Free',
                },
                { icon: '👥', label: 'Capacity', value: `${session.participants?.length || 0} / ${session.maxParticipants} enrolled` },
                { icon: '🎯', label: 'Spots Left', value: spotsLeft > 0 ? `${spotsLeft} available` : 'Fully booked' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="session-detail-item">
                  <span className="session-detail-icon">{icon}</span>
                  <div>
                    <div className="session-detail-label">{label}</div>
                    <div className="session-detail-value">{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {session.meetingLink && (
              <div className="session-meeting-box">
                <span>🔗</span>
                <div>
                  <div className="session-meeting-label">Meeting Link</div>
                  <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className="session-meeting-link">{session.meetingLink}</a>
                </div>
              </div>
            )}

            {hasMaterial && (
              <div className="session-material-box">
                <div>
                  <div className="session-material-label">Lecture Material</div>
                  <div className="session-material-name">{material.originalName || material.filename}</div>
                  {material.size > 0 && (
                    <div className="session-material-size">{formatFileSize(material.size)}</div>
                  )}
                </div>
                {materialUrl ? (
                  <a href={materialUrl} download={material.originalName || material.filename} className="btn btn-secondary">
                    Download Material
                  </a>
                ) : (
                  <span className="session-material-size">File is available but download URL is missing.</span>
                )}
              </div>
            )}
          </div>

          {isTutor && session.participants?.length > 0 && (
            <div className="card card-body">
              <h3 className="session-participants-title">Enrolled Students ({session.participants.length})</h3>
              <div className="session-participants-list">
                {session.participants.map(p => (
                  <div key={p._id} className="session-participant-row">
                    <div className="session-participant-avatar">
                      {p.profilePicture
                        ? <img src={`${API_BASE_URL}${p.profilePicture}`} alt="" className="session-participant-avatar-img" />
                        : <span className="session-participant-avatar-fallback">{p.name?.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div>
                      <div className="session-participant-name">{p.name}</div>
                      <div className="session-participant-email">{p.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="session-detail-sidebar">
          <div className="card card-body session-sidebar-card">
            <h4 className="session-tutor-heading">Your Tutor</h4>
            <div className="session-tutor-row">
              <div className="session-tutor-avatar">
                {session.tutor?.profilePicture
                  ? <img src={`${API_BASE_URL}${session.tutor.profilePicture}`} alt="" className="session-tutor-avatar-img" />
                  : <span className="session-tutor-avatar-fallback">{session.tutor?.name?.charAt(0).toUpperCase()}</span>}
              </div>
              <div>
                <div className="session-tutor-name">{session.tutor?.name}</div>
                <div className="session-tutor-email">{session.tutor?.email}</div>
              </div>
            </div>
            {session.tutor?.bio && <p className="session-tutor-bio">{session.tutor.bio}</p>}
            {session.tutor?.subjects?.length > 0 && (
              <div className="session-tutor-subjects">
                {session.tutor.subjects.map(s => <span key={s} className="badge badge-blue">{s}</span>)}
              </div>
            )}
          </div>

          {user?.role === 'student' && (
            <div className="card card-body">
              <BookingButton session={session} isBooked={isBooked} onBookingChange={handleBookingChange} />
            </div>
          )}
          {isTutor && (
            <div className="card card-body session-manage-card">
              <Link to={`/sessions/${id}/edit`} className="btn btn-outline btn-full">✏️ Edit Session</Link>
              <button className="btn btn-danger btn-full" onClick={handleDelete} disabled={deleting}>
                {deleting ? <><span className="spinner" />Deleting…</> : '🗑 Delete Session'}
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    
  );
}