import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 className="kuppi-page-title">{isStudent ? '📋 My Bookings' : '🗓 My Sessions'}</h1>
          <p className="kuppi-page-subtitle">{isStudent ? 'Sessions you have booked' : 'Sessions you are teaching'}</p>
        </div>
        {!isStudent && (
          <Link to="/create-session" className="btn btn-primary">+ Create New Session</Link>
        )}
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        {isStudent ? (
          <>
            <div style={styles.statCard}><div style={styles.statNum}>{stats.total}</div><div style={styles.statLabel}>Total Bookings</div></div>
            <div style={styles.statCard}><div style={{ ...styles.statNum, color: 'var(--success)' }}>{stats.confirmed}</div><div style={styles.statLabel}>Confirmed</div></div>
            <div style={styles.statCard}><div style={{ ...styles.statNum, color: 'var(--danger)' }}>{stats.cancelled}</div><div style={styles.statLabel}>Cancelled</div></div>
          </>
        ) : (
          <>
            <div style={styles.statCard}><div style={styles.statNum}>{stats.total}</div><div style={styles.statLabel}>Total Sessions</div></div>
            <div style={styles.statCard}><div style={{ ...styles.statNum, color: 'var(--primary)' }}>{stats.upcoming}</div><div style={styles.statLabel}>Upcoming</div></div>
            <div style={styles.statCard}><div style={{ ...styles.statNum, color: 'var(--secondary)' }}>{stats.totalStudents}</div><div style={styles.statLabel}>Total Students</div></div>
          </>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner spinner-dark" style={{ width: 36, height: 36, margin: '0 auto' }} />
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{isStudent ? '📭' : '📅'}</div>
          <h3>{isStudent ? 'No bookings yet' : 'No sessions yet'}</h3>
          <p style={{ marginBottom: 20 }}>{isStudent ? 'Browse available sessions and book one!' : 'Create your first Kuppi session.'}</p>
          <Link to={isStudent ? '/sessions' : '/create-session'} className="btn btn-primary">
            {isStudent ? 'Browse Sessions' : 'Create Session'}
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map(item => {
            const session = isStudent ? item.session : item;
            if (!session) return null;
            const sessionDate = new Date(session.date);
            const isPast = sessionDate < new Date();

            return (
              <div key={item._id} className="card" style={{ ...styles.item, opacity: (isStudent && item.status === 'cancelled') ? 0.6 : 1 }}>
                <div style={styles.itemLeft}>
                  <div style={styles.dateBox}>
                    <span style={styles.dateMonth}>{sessionDate.toLocaleString('en-US', { month: 'short' })}</span>
                    <span style={styles.dateDay}>{sessionDate.getDate()}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700 }}>{session.title}</h3>
                      <StatusBadge status={isStudent ? item.status : session.status} />
                      {isPast && <span className="badge badge-yellow">Past</span>}
                    </div>
                    <div style={styles.sessionMeta}>
                      <span>📖 {session.subject}</span>
                      <span>🕐 {sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>⏱ {session.duration} min</span>
                      {isStudent
                        ? <span>👨‍🏫 {session.tutor?.name}</span>
                        : <span>👥 {session.participants?.length || 0}/{session.maxParticipants} students</span>
                      }
                    </div>
                  </div>
                </div>

                <div style={styles.itemActions}>
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
  );
}

const styles = {
  statsRow: { display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 120, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', textAlign: 'center' },
  statNum: { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' },
  statLabel: { fontSize: 13, color: 'var(--text-muted)', marginTop: 4 },
  item: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', gap: 16, flexWrap: 'wrap' },
  itemLeft: { display: 'flex', alignItems: 'center', gap: 16, flex: 1 },
  dateBox: { width: 52, height: 56, background: 'var(--primary-light)', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dateMonth: { fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  dateDay: { fontSize: 22, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 },
  sessionMeta: { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' },
  itemActions: { display: 'flex', gap: 8, flexShrink: 0 },
};
