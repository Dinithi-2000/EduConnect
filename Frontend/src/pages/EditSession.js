import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

export default function EditSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    subject: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    maxParticipants: 10,
    meetingLink: '',
    status: 'upcoming',
  });

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data } = await api.get(`/sessions/${id}`);
        const session = data.session;
        const dateObj = new Date(session.date);

        const pad = (n) => String(n).padStart(2, '0');
        const localDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
        const localTime = `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;

        setForm({
          title: session.title || '',
          subject: session.subject || '',
          description: session.description || '',
          date: localDate,
          time: localTime,
          duration: session.duration || 60,
          maxParticipants: session.maxParticipants || 10,
          meetingLink: session.meetingLink || '',
          status: session.status || 'upcoming',
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load session details.');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.date || !form.time) {
      setError('Please select both a date and time.');
      return;
    }

    const combinedDate = new Date(`${form.date}T${form.time}:00`);

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        subject: form.subject,
        description: form.description,
        date: combinedDate.toISOString(),
        duration: parseInt(form.duration, 10),
        maxParticipants: parseInt(form.maxParticipants, 10),
        meetingLink: form.meetingLink,
        status: form.status,
      };

      await api.put(`/sessions/${id}`, payload);
      navigate(`/sessions/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update session.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner spinner-dark" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <Link to={`/sessions/${id}`} className="btn btn-secondary" style={{ marginBottom: 20 }}>
        ← Back to Session
      </Link>

      <div className="kuppi-page-header">
        <h1 className="kuppi-page-title">✏ Edit Session</h1>
        <p className="kuppi-page-subtitle">Update your session details for students.</p>
      </div>

      <div style={{ maxWidth: 760 }}>
        <div className="card card-body">
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Session Title *</label>
              <input name="title" className="form-input" value={form.title} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label">Subject *</label>
              <input name="subject" className="form-input" value={form.subject} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" className="form-textarea" value={form.description} onChange={handleChange} rows={4} />
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Date *</label>
                <input name="date" type="date" className="form-input" value={form.date} onChange={handleChange} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Time *</label>
                <input name="time" type="time" className="form-input" value={form.time} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Duration (minutes) *</label>
                <select name="duration" className="form-select" value={form.duration} onChange={handleChange} required>
                  {[30, 45, 60, 90, 120, 150, 180].map((d) => (
                    <option key={d} value={d}>{d} min {d >= 60 ? `(${d / 60}h)` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Max Participants *</label>
                <input name="maxParticipants" type="number" className="form-input" value={form.maxParticipants} onChange={handleChange} min={1} max={100} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Meeting Link (optional)</label>
              <input name="meetingLink" type="url" className="form-input" value={form.meetingLink} onChange={handleChange} />
            </div>

            <div className="form-group" style={{ maxWidth: 280 }}>
              <label className="form-label">Status *</label>
              <select name="status" className="form-select" value={form.status} onChange={handleChange} required>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" />Saving…</> : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(`/sessions/${id}`)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
