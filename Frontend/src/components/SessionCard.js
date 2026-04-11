import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { createStripeCheckoutSession } from '../services/commerceService';
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

const COURSE_BANNERS = [
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80',
];

const getSessionCoverImage = (session, index = 0) => {
  const safeIndex = Number.isInteger(index) && index >= 0 ? index : 0;
  return COURSE_BANNERS[safeIndex % COURSE_BANNERS.length];
};

export default function SessionCard({ session, isBooked = false, userRole, onBookStatusChange, listIndex = 0 }) {
  const role = String(userRole || '').toLowerCase();
  const showCardImage = role === 'student';
  const spotsLeft = session.maxParticipants - (session.participants?.length || 0);
  const isFull = spotsLeft <= 0;
  const sessionDate = new Date(session.date);
  const isPast = sessionDate <= new Date();
  const subStyle = getSubjectStyle(session.subject);
  const coverImage = getSessionCoverImage(session, listIndex);
  const moduleCount = Array.isArray(session?.materials)
    ? session.materials.length
    : session?.material
      ? 1
      : 1;
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const spotsClass = isFull ? 'is-full' : spotsLeft <= 3 ? 'is-low' : 'is-available';

  const handleBookNow = async () => {
    if (isBooked || isFull || isPast) return;

    setBookingLoading(true);
    setBookingError('');
    try {
      if (session.isPremium && !session.hasPremiumAccess) {
        const payload = {
          premiumItemId: `kuppi-premium-${session._id}`,
          successUrl: `${window.location.origin}/sessions`,
          cancelUrl: `${window.location.origin}/sessions?payment=cancelled`,
        };

        const checkoutSession = await createStripeCheckoutSession(payload);
        const checkoutUrl = checkoutSession?.data?.checkoutUrl;
        if (!checkoutUrl) {
          throw new Error('Unable to start payment. Please try again.');
        }

        window.location.href = checkoutUrl;
        return;
      }

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
      {showCardImage && (
        <div className="session-card-image-wrap">
          <img
            src={coverImage}
            alt={`${session.title} cover`}
            className="session-card-image"
            loading="lazy"
          />
          <span className="session-card-image-badge">
            {moduleCount} module{moduleCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="session-card-top">
        <span className="session-subject-badge" style={{ background: subStyle.bg, color: subStyle.color }}>
          {session.subject}
        </span>
        {session.isPremium && (
          <span className="badge badge-yellow session-premium-badge">
            Premium {`${(session.premiumCurrency || 'USD').toUpperCase()} ${Number(session.premiumPrice || 0).toFixed(2)}`}
          </span>
        )}
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
              : <span className="session-card-tutor-initial">{session.tutor?.name?.charAt(0)?.toUpperCase() || '?'}</span>
            }
          </div>
          <span className="session-card-tutor-name">{session.tutor?.name}</span>
        </div>

        <div className="session-card-actions">
          <span className={`session-card-spots ${spotsClass}`}>
            {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
          </span>
          <div className="session-card-cta">
            {userRole === 'student' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleBookNow}
                disabled={bookingLoading || isBooked || isFull || isPast}
              >
                {isBooked
                  ? 'Booked'
                  : bookingLoading
                    ? (session.isPremium && !session.hasPremiumAccess ? 'Redirecting...' : 'Booking...')
                    : isPast
                      ? 'Ended'
                      : (session.isPremium && !session.hasPremiumAccess ? 'Pay & Book' : 'Book the session')}
              </button>
            )}
            <Link to={`/sessions/${session._id}`} className="btn btn-primary btn-sm">View</Link>
          </div>
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
