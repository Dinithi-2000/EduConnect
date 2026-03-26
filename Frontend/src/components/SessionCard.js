import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const subjectColors = {
  default: { bg: '#eff6ff', color: '#1d4ed8' },
  math: { bg: '#fef3c7', color: '#92400e' },
  science: { bg: '#d1fae5', color: '#065f46' },
  physics: { bg: '#ede9fe', color: '#5b21b6' },
  chemistry: { bg: '#fee2e2', color: '#991b1b' },
  english: { bg: '#cffafe', color: '#155e75' },
};

const getSubjectStyle = (subject) => {
  const key = subject?.toLowerCase();
  return subjectColors[key] || subjectColors.default;
};

export default function SessionCard({ session, isBooked = false, userRole, onBookStatusChange }) {
  const spotsLeft = session.maxParticipants - (session.participants?.length || 0);
  const isFull = spotsLeft <= 0;
  const sessionDate = new Date(session.date);
  const isPast = sessionDate <= new Date();
  const subStyle = getSubjectStyle(session.subject);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const handleBookNow = async () => {
    if (isBooked || isFull || isPast) return;

    setBookingLoading(true);
    setBookingError('');
    try {
      await api.post(`/bookings/${session._id}`);
      if (onBookStatusChange) onBookStatusChange(session._id, true);
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="card session-card" style={styles.card}>
      <div className="session-card-top" style={styles.cardTop}>
        <span style={{ ...styles.subjectBadge, background: subStyle.bg, color: subStyle.color }}>
          {session.subject}
        </span>
        {isBooked && <span className="badge badge-green">✓ Booked</span>}
        {isFull && !isBooked && <span className="badge badge-red">Full</span>}
      </div>

      <h3 className="session-card-title" style={styles.title}>{session.title}</h3>

      {session.description && (
        <p style={styles.description}>{session.description.length > 100 ? session.description.slice(0, 100) + '…' : session.description}</p>
      )}

      <div className="session-card-meta" style={styles.meta}>
        <div className="session-card-meta-item" style={styles.metaItem}>
          <span style={styles.metaIcon}>📅</span>
          <span>{sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div className="session-card-meta-item" style={styles.metaItem}>
          <span style={styles.metaIcon}>🕐</span>
          <span>{sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="session-card-meta-item" style={styles.metaItem}>
          <span style={styles.metaIcon}>⏱</span>
          <span>{session.duration} min</span>
        </div>
      </div>

      <div className="session-card-footer" style={styles.footer}>
        <div className="session-card-tutor" style={styles.tutorInfo}>
          <div style={styles.tutorAvatar}>
            {session.tutor?.profilePicture
              ? <img src={`http://localhost:5000${session.tutor.profilePicture}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontWeight: 700, color: '#fff', fontSize: 12 }}>{session.tutor?.name?.charAt(0)?.toUpperCase()}</span>
            }
          </div>
          <span style={styles.tutorName}>{session.tutor?.name}</span>
        </div>

        <div className="session-card-actions" style={styles.right}>
          <span style={{ ...styles.spots, color: isFull ? 'var(--danger)' : spotsLeft <= 3 ? 'var(--warning)' : 'var(--success)' }}>
            {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
          </span>
          {userRole === 'student' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleBookNow}
              disabled={bookingLoading || isBooked || isFull || isPast}
            >
              {isBooked ? 'Booked' : bookingLoading ? 'Booking...' : isPast ? 'Ended' : 'Book the session'}
            </button>
          )}
          <Link to={`/sessions/${session._id}`} className="btn btn-primary btn-sm">View</Link>
        </div>
      </div>
      {bookingError && (
        <div className="alert alert-error" style={{ marginTop: 8, marginBottom: 0 }}>
          {bookingError}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { display: 'flex', flexDirection: 'column', gap: 12, padding: 20, transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' },
  cardTop: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  subjectBadge: { padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 },
  title: { fontSize: 17, fontWeight: 700, lineHeight: 1.3, color: 'var(--text-primary)' },
  description: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 },
  meta: { display: 'flex', flexWrap: 'wrap', gap: 12 },
  metaItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)' },
  metaIcon: { fontSize: 14 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 4 },
  tutorInfo: { display: 'flex', alignItems: 'center', gap: 8 },
  tutorAvatar: { width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  tutorName: { fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  spots: { fontSize: 12, fontWeight: 600 },
};
