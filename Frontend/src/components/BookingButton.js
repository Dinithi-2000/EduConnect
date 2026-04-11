import React, { useState } from 'react';
import api from '../services/api';
import { createStripeCheckoutSession } from '../services/commerceService';

export default function BookingButton({ session, isBooked: initialBooked, onBookingChange }) {
  const [isBooked, setIsBooked] = useState(initialBooked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const spotsLeft = session.maxParticipants - (session.participants?.length || 0);
  const isFull = spotsLeft <= 0 && !isBooked;
  const isPast = new Date(session.date) <= new Date();

  const handleBook = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (session.isPremium && !session.hasPremiumAccess) {
        const payload = {
          premiumItemId: `kuppi-premium-${session._id}`,
          successUrl: `${window.location.origin}/sessions/${session._id}`,
          cancelUrl: `${window.location.origin}/sessions/${session._id}?payment=cancelled`,
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
      setIsBooked(true);
      setSuccess('Session booked successfully! Check your email for confirmation.');
      onBookingChange && onBookingChange(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setLoading(true);
    setError('');
    try {
      await api.delete(`/bookings/${session._id}`);
      setIsBooked(false);
      setSuccess('Booking cancelled successfully.');
      onBookingChange && onBookingChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 12 }}>{success}</div>}

      {isPast ? (
        <button className="btn btn-secondary btn-lg btn-full" disabled>Session Ended</button>
      ) : isBooked ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="alert alert-success" style={{ margin: 0 }}>✓ You're booked for this session!</div>
          <button className="btn btn-danger btn-full booking-cancel-btn" onClick={handleCancel} disabled={loading}>
            {loading ? <><span className="spinner" />Cancelling…</> : 'Cancel Booking'}
          </button>
        </div>
      ) : isFull ? (
        <button className="btn btn-secondary btn-lg btn-full" disabled>Session Full</button>
      ) : (
        <button className="btn btn-primary btn-lg btn-full" onClick={handleBook} disabled={loading}>
          {loading
            ? <><span className="spinner" />{session.isPremium && !session.hasPremiumAccess ? 'Redirecting…' : 'Booking…'}</>
            : session.isPremium && !session.hasPremiumAccess
              ? '💳 Pay & Book This Session'
              : '🎓 Book This Session'}
        </button>
      )}
    </div>
  );
}
