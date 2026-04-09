import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BookingButton from '../components/BookingButton';

export default function SessionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
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
    // Update participant count optimistically
    setSession(prev => ({
      ...prev,
      participants: booked
        ? [...(prev.participants || []), { _id: user.id }]
        : (prev.participants || []).filter(p => p._id !== user.id),
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner spinner-dark" style={{ width: 40, height: 40 }} />
    </div>
  );

  if (error) return (
    <div className="container" style={{ paddingTop: 40 }}>
      <div className="alert alert-error">{error}</div>
      <Link to="/sessions" className="btn btn-secondary">← Back to Sessions</Link>
    </div>
  );

  const sessionDate = new Date(session.date);
  const spotsLeft = session.maxParticipants - (session.participants?.length || 0);
  const isTutor = user?.role === 'tutor' && session.tutor?._id === user?.id;

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <Link to="/sessions" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, textDecoration: 'none' }}>
        ← Back to Sessions
      </Link>

      <div style={styles.layout}>
        {/* Main content */}
        <div style={{ flex: 1 }}>
          <div className="card card-body" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span style={styles.subjectBadge}>{session.subject}</span>
                <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 10 }}>{session.title}</h1>
              </div>
              <span className={`badge ${session.status === 'upcoming' ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 13 }}>
                {session.status}
              </span>
            </div>

            {session.description && (
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 16 }}>{session.description}</p>
            )}

            <div style={styles.detailsGrid}>
              {[
                { icon: '📅', label: 'Date', value: sessionDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                { icon: '🕐', label: 'Time', value: sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
                { icon: '⏱', label: 'Duration', value: `${session.duration} minutes` },
                { icon: '👥', label: 'Capacity', value: `${session.participants?.length || 0} / ${session.maxParticipants} enrolled` },
                { icon: '🎯', label: 'Spots Left', value: spotsLeft > 0 ? `${spotsLeft} available` : 'Fully booked' },
              ].map(({ icon, label, value }) => (
                <div key={label} style={styles.detailItem}>
                  <span style={styles.detailIcon}>{icon}</span>
                  <div>
                    <div style={styles.detailLabel}>{label}</div>
                    <div style={styles.detailValue}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {session.meetingLink && (
              <div style={{ marginTop: 20, padding: '14px 18px', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>🔗</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 2 }}>Meeting Link</div>
                  <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: 'var(--primary)' }}>{session.meetingLink}</a>
                </div>
              </div>
            )}
          </div>

          {/* Participants (tutor view) */}
          {isTutor && session.participants?.length > 0 && (
            <div className="card card-body">
              <h3 style={{ marginBottom: 16 }}>Enrolled Students ({session.participants.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {session.participants.map(p => (
                  <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {p.profilePicture ? <img src={`http://localhost:5000${p.profilePicture}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{p.name?.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          {/* Tutor info */}
          <div className="card card-body" style={{ marginBottom: 16 }}>
            <h4 style={{ marginBottom: 14, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Your Tutor</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {session.tutor?.profilePicture ? <img src={`http://localhost:5000${session.tutor.profilePicture}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{session.tutor?.name?.charAt(0).toUpperCase()}</span>}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{session.tutor?.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{session.tutor?.email}</div>
              </div>
            </div>
            {session.tutor?.bio && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{session.tutor.bio}</p>}
            {session.tutor?.subjects?.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {session.tutor.subjects.map(s => <span key={s} className="badge badge-blue">{s}</span>)}
              </div>
            )}
          </div>

          {/* Booking / Tutor actions */}
          {user?.role === 'student' && (
            <div className="card card-body">
              <BookingButton session={session} isBooked={isBooked} onBookingChange={handleBookingChange} />
            </div>
          )}
          {isTutor && (
            <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

const styles = {
  layout: { display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' },
  sidebar: { width: 300, flexShrink: 0 },
  subjectBadge: { display: 'inline-block', padding: '4px 12px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 100, fontSize: 13, fontWeight: 600 },
  detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 },
  detailItem: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  detailIcon: { fontSize: 20, marginTop: 2 },
  detailLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  detailValue: { fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginTop: 2 },
};
