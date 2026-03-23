import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import SessionCard from '../components/SessionCard';
import { useAuth } from '../context/AuthContext';

export default function SessionList() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [bookedIds, setBookedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchSessions(); };

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div className="page-header">
        <h1 className="page-title">📚 Kuppi Sessions</h1>
        <p className="page-subtitle">Find and book expert-led study sessions</p>
      </div>

      {/* Search & Filter */}
      <form onSubmit={handleSearch} style={styles.searchBar}>
        <input
          className="form-input"
          placeholder="🔍 Search by title..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 2 }}
        />
        <input
          className="form-input"
          placeholder="📖 Filter by subject..."
          value={subject}
          onChange={e => setSubject(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary">Search</button>
        {(search || subject) && (
          <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setSubject(''); setPage(1); }}>
            Clear
          </button>
        )}
      </form>

      {/* Sessions Grid */}
      {loading ? (
        <div style={styles.loadingCenter}>
          <div className="spinner spinner-dark" style={{ width: 36, height: 36 }} />
          <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Loading sessions…</p>
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No sessions found</h3>
          <p>{search || subject ? 'Try different search terms.' : 'No upcoming sessions available yet.'}</p>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>{sessions.length} session{sessions.length !== 1 ? 's' : ''} found</p>
          <div className="grid grid-2" style={{ gap: 20 }}>
            {sessions.map(session => (
              <SessionCard key={session._id} session={session} isBooked={bookedIds.has(session._id)} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  searchBar: { display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' },
  loadingCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 40 },
};
