import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function CreateSession() {
  const navigate = useNavigate();
  const [lectureMaterial, setLectureMaterial] = useState(null);
  const [form, setForm] = useState({
    title: '',
    subject: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    maxParticipants: 10,
    meetingLink: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  const handleMaterialChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setLectureMaterial(null);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Lecture material must be smaller than 15MB.');
      return;
    }

    setLectureMaterial(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Combine date and time into a single ISO string
    if (!form.date || !form.time) {
      return setError('Please select both a date and a time.');
    }

    const combinedDate = new Date(`${form.date}T${form.time}:00`);
    if (combinedDate <= new Date()) {
      return setError('Session date and time must be in the future.');
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('subject', form.subject);
      payload.append('description', form.description);
      payload.append('date', combinedDate.toISOString());
      payload.append('duration', parseInt(form.duration));
      payload.append('maxParticipants', parseInt(form.maxParticipants));
      payload.append('meetingLink', form.meetingLink);
      if (lectureMaterial) {
        payload.append('lectureMaterial', lectureMaterial);
      }

      const { data } = await api.post('/sessions', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/sessions/${data.session._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Min date: today (for date picker)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div className="kuppi-page-header">
        <h1 className="kuppi-page-title">✨ Create Kuppi Session</h1>
        <p className="kuppi-page-subtitle">Share your knowledge — create a session for students</p>
      </div>

      <div style={{ maxWidth: 680 }}>
        <div className="card card-body">
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Session Title *</label>
              <input name="title" className="form-input" value={form.title} onChange={handleChange} placeholder="e.g. A/L Maths - Integration Techniques" required />
            </div>

            <div className="form-group">
              <label className="form-label">Subject *</label>
              <input name="subject" className="form-input" value={form.subject} onChange={handleChange} placeholder="e.g. Mathematics, Physics, Chemistry" required />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" className="form-textarea" value={form.description} onChange={handleChange}
                placeholder="What will students learn? What topics will be covered? Any prerequisites?" rows={4} />
            </div>

            <div style={styles.row}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Date *</label>
                <input name="date" type="date" className="form-input" value={form.date} onChange={handleChange} min={today} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Time *</label>
                <input name="time" type="time" className="form-input" value={form.time} onChange={handleChange} required />
              </div>
            </div>

            <div style={styles.row}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Duration (minutes) *</label>
                <select name="duration" className="form-select" value={form.duration} onChange={handleChange} required>
                  {[30, 45, 60, 90, 120, 150, 180].map(d => (
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
              <input name="meetingLink" type="url" className="form-input" value={form.meetingLink} onChange={handleChange} placeholder="https://meet.google.com/..." />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Google Meet, Zoom, or any online meeting link</div>
            </div>

            <div className="form-group">
              <label className="form-label">Lecture Material (optional)</label>
              <input
                type="file"
                className="form-input"
                onChange={handleMaterialChange}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.ppt,.pptx,.txt"
              />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Upload PDF, images, slides, docs, or text files (max 15MB).
              </div>
              {lectureMaterial && (
                <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6 }}>
                  Selected: {lectureMaterial.name}
                </div>
              )}
            </div>

            {/* Preview */}
            {form.title && (
              <div style={styles.preview}>
                <div style={styles.previewLabel}>Preview</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{form.title}</div>
                {form.subject && <div style={{ color: 'var(--primary)', fontSize: 13, marginTop: 4 }}>{form.subject}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {form.date && form.time && <span>📅 {new Date(`${form.date}T${form.time}`).toLocaleString()}</span>}
                  <span>⏱ {form.duration} min</span>
                  <span>👥 Up to {form.maxParticipants} students</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" />Creating…</> : '🚀 Create Session'}
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/my-sessions')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  row: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  preview: { background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '16px 20px', marginBottom: 20 },
  previewLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 },
};
