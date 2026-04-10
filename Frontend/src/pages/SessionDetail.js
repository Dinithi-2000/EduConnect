import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BookingButton from '../components/BookingButton';
import DashboardLayout from '../components/DashboardLayout';

const API_BASE_URL = 'http://localhost:5000';

export default function SessionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const isAdminView = ['admin', 'teacher'].includes(role);
  const currentUserId = user?.id || user?._id;
  const navigate = useNavigate();
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

  if (loading) return (
    <DashboardLayout activeSection="Kuppi Sessions" theme={isAdminView ? 'dark' : 'light'}>
      <div className={`container kuppi-page kuppi-page-space-top session-detail-page ${isAdminView ? 'admin-session-detail-theme' : ''}`}>
        <div className="session-detail-loading">
        <div className="spinner spinner-dark session-detail-loading-spinner" />
        </div>
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout activeSection="Kuppi Sessions" theme={isAdminView ? 'dark' : 'light'}>
      <div className={`container kuppi-page kuppi-page-space-top session-detail-page ${isAdminView ? 'admin-session-detail-theme' : ''}`}>
        <div className="alert alert-error">{error}</div>
        <Link to="/sessions" className="btn btn-secondary">← Back to Sessions</Link>
      </div>
    </DashboardLayout>
  );

  const sessionDate = new Date(session.date);
  const spotsLeft = session.maxParticipants - (session.participants?.length || 0);
  const canManageSession = user?.role === 'tutor' || user?.role === 'teacher' || user?.role === 'admin';
  const isTutor = canManageSession && session.tutor?._id === currentUserId;
  const material = session.lectureMaterial;
  const materialUrl = material?.path ? `${API_BASE_URL}${material.path}` : '';

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DashboardLayout activeSection="Kuppi Sessions" theme={isAdminView ? 'dark' : 'light'}>
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

            {material?.path && (
              <div className="session-material-box">
                <div>
                  <div className="session-material-label">Lecture Material</div>
                  <div className="session-material-name">{material.originalName || material.filename}</div>
                  {material.size > 0 && (
                    <div className="session-material-size">{formatFileSize(material.size)}</div>
                  )}
                </div>
                <a href={materialUrl} download={material.originalName || material.filename} className="btn btn-secondary">
                  Download Material
                </a>
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
    </DashboardLayout>
  );
}