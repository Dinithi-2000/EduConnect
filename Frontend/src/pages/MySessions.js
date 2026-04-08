import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import './MySessions.css';

const StatusBadge = ({ status }) => {
  const map = { confirmed: 'badge-green', cancelled: 'badge-red', upcoming: 'badge-blue', completed: 'badge-yellow' };
  return <span className={`badge ${map[status] || 'badge-blue'}`}>{status}</span>;
};

export default function MySessions() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);

  const isStudent = user?.role === 'student';
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isStudent) {
          const { data } = await api.get('/bookings/my-bookings');
          setItems(data.bookings);
        } else {
          const { data } = await api.get('/sessions/my-sessions');
          setItems(data.sessions);
        }
      } catch {
        setError('Failed to load your sessions.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isStudent]);

  const handleCancel = async (sessionId) => {
    if (!window.confirm('Cancel this booking?')) return;
    setCancelling(sessionId);
    try {
      await api.delete(`/bookings/${sessionId}`);
      setItems(prev => prev.map(b =>
        b.session?._id === sessionId ? { ...b, status: 'cancelled' } : b
      ));
    } catch (err) {
      alert(err.response?.data?.message || 'Cancellation failed.');
    } finally {
      setCancelling(null);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Delete this session and all its bookings?')) return;
    try {
      await api.delete(`/sessions/${sessionId}`);
      setItems(prev => prev.filter(s => s._id !== sessionId));
    } catch (err) {
      alert(err.response?.data?.message || 'Deletion failed.');
    }
  };

  const stats = isStudent
    ? { total: items.length, confirmed: items.filter(b => b.status === 'confirmed').length, cancelled: items.filter(b => b.status === 'cancelled').length }
    : { total: items.length, upcoming: items.filter(s => s.status === 'upcoming').length, totalStudents: items.reduce((sum, s) => sum + (s.participants?.length || 0), 0) };

  return (
    <DashboardLayout activeSection="Kuppi Sessions" theme="light">
      <div className="container kuppi-page my-sessions-page">
        <div className="my-sessions-header">
          <div>
            <h1 className="kuppi-page-title">{isStudent ? 'My Bookings' : 'My Sessions'}</h1>
            <p className="kuppi-page-subtitle">{isStudent ? 'Sessions you have booked' : 'Sessions you are teaching'}</p>
          </div>
          {!isStudent && (
            <Link to="/create-session" className="btn btn-primary">Create New Session</Link>
          )}
        </div>

      {/* Stats */}
      <div className="my-sessions-stats-row">
        {isStudent ? (
          <>
            <div className="my-sessions-stat-card"><div className="my-sessions-stat-num">{stats.total}</div><div className="my-sessions-stat-label">Total Bookings</div></div>
            <div className="my-sessions-stat-card"><div className="my-sessions-stat-num stat-confirmed">{stats.confirmed}</div><div className="my-sessions-stat-label">Confirmed</div></div>
            <div className="my-sessions-stat-card"><div className="my-sessions-stat-num stat-cancelled">{stats.cancelled}</div><div className="my-sessions-stat-label">Cancelled</div></div>
          </>
        ) : (
          <>
            <div className="my-sessions-stat-card"><div className="my-sessions-stat-num">{stats.total}</div><div className="my-sessions-stat-label">Total Sessions</div></div>
            <div className="my-sessions-stat-card"><div className="my-sessions-stat-num stat-upcoming">{stats.upcoming}</div><div className="my-sessions-stat-label">Upcoming</div></div>
            <div className="my-sessions-stat-card"><div className="my-sessions-stat-num stat-students">{stats.totalStudents}</div><div className="my-sessions-stat-label">Total Students</div></div>
          </>
        )}
      </div>

      {loading ? (
        <div className="my-sessions-loading-wrap">
          <div className="spinner spinner-dark my-sessions-loading-spinner" />
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : items.length === 0 ? (
        <div className="empty-state my-sessions-empty-state">
          <div className="empty-icon">{isStudent ? '📭' : '📅'}</div>
          <h3>{isStudent ? 'No bookings yet' : 'No sessions yet'}</h3>
          <p className="my-sessions-empty-text">{isStudent ? 'Browse available sessions and book one!' : 'Create your first Kuppi session.'}</p>
          <Link to={isStudent ? '/sessions' : '/create-session'} className="btn btn-primary">
            {isStudent ? 'Browse Sessions' : 'Create Session'}
          </Link>
        </div>
      ) : (
        <div className="my-sessions-list">
          {items.map(item => {
            const session = isStudent ? item.session : item;
            if (!session) return null;
            const sessionDate = new Date(session.date);
            const isPast = sessionDate < new Date();

            return (
              <div key={item._id} className={`card my-sessions-item ${(isStudent && item.status === 'cancelled') ? 'is-cancelled' : ''}`}>
                <div className="my-sessions-item-left">
                  <div className="my-sessions-date-box">
                    <span className="my-sessions-date-month">{sessionDate.toLocaleString('en-US', { month: 'short' })}</span>
                    <span className="my-sessions-date-day">{sessionDate.getDate()}</span>
                  </div>
                  <div>
                    <div className="my-sessions-item-head">
                      <h3 className="my-sessions-item-title">{session.title}</h3>
                      <StatusBadge status={isStudent ? item.status : session.status} />
                      {isPast && <span className="badge badge-yellow">Past</span>}
                    </div>
                    <div className="my-sessions-meta">
                      <span>{session.subject}</span>
                      <span>{sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>{session.duration} min</span>
                      {isStudent
                        ? <span>Tutor: {session.tutor?.name}</span>
                        : <span>{session.participants?.length || 0}/{session.maxParticipants} students</span>
                      }
                    </div>
                  </div>
                </div>

                <div className="my-sessions-item-actions">
                  <Link to={`/sessions/${session._id}`} className="btn btn-outline btn-sm">View</Link>
                  {isStudent && item.status === 'confirmed' && !isPast && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleCancel(session._id)} disabled={cancelling === session._id}>
                      {cancelling === session._id ? <span className="spinner" /> : 'Cancel'}
                    </button>
                  )}
                  {!isStudent && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSession(session._id)}>Delete</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
