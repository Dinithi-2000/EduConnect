import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './SessionCard.css';

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

  const spotsClass = isFull ? 'is-full' : spotsLeft <= 3 ? 'is-low' : 'is-available';

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
    <div className="card session-card">
      <div className="session-card-top">
        <span className="session-subject-badge" style={{ background: subStyle.bg, color: subStyle.color }}>
          {session.subject}
        </span>
        {isBooked && <span className="badge badge-green">✓ Booked</span>}
        {isFull && !isBooked && <span className="badge badge-red">Full</span>}
      </div>

      <h3 className="session-card-title">{session.title}</h3>

      {session.description && (
        <p className="session-card-description">{session.description.length > 100 ? session.description.slice(0, 100) + '...' : session.description}</p>
      )}

      <div className="session-card-meta">
        <div className="session-card-meta-item">
          <span className="session-card-meta-icon">📅</span>
          <span>{sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div className="session-card-meta-item">
          <span className="session-card-meta-icon">🕐</span>
          <span>{sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="session-card-meta-item">
          <span className="session-card-meta-icon">⏱</span>
          <span>{session.duration} min</span>
        </div>
      </div>

      <div className="session-card-footer">
        <div className="session-card-tutor">
          <div className="session-card-tutor-avatar">
            {session.tutor?.profilePicture
              ? <img src={`http://localhost:5000${session.tutor.profilePicture}`} alt="" className="session-card-tutor-image" />
              : <span className="session-card-tutor-initial">{session.tutor?.name?.charAt(0)?.toUpperCase()}</span>
            }
          </div>
          <span className="session-card-tutor-name">{session.tutor?.name}</span>
        </div>

        <div className="session-card-actions">
          <span className={`session-card-spots ${spotsClass}`}>
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
        <div className="alert alert-error session-card-error">
          {bookingError}
        </div>
      )}
    </div>
  );
}
