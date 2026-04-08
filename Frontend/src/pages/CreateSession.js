import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import './CreateSession.css';

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

      const { data } = await api.post('/sessions', payload);
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
    <DashboardLayout activeSection="Kuppi Sessions" theme="light">
      <div className="container kuppi-page create-session-page">
        <div className="kuppi-page-header create-session-header">
          <h1 className="kuppi-page-title">Create Kuppi Session</h1>
        </div>

      <div className="create-session-shell">
        <div className="card card-body create-session-card">
          <h2 className="create-session-card-title">Session Details</h2>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="create-session-form">
            <div className="form-group">
              <label className="form-label">Session Title *</label>
              <input
                name="title"
                className="form-input"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. A/L Maths - Integration Techniques"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subject *</label>
              <input name="subject" className="form-input" value={form.subject} onChange={handleChange} placeholder="e.g. Mathematics, Physics, Chemistry" required />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-textarea"
                value={form.description}
                onChange={handleChange}
                placeholder="What will students learn? What topics will be covered? Any prerequisites?"
                rows={4}
              />
            </div>

            <div className="create-session-grid-2">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input name="date" type="date" className="form-input" value={form.date} onChange={handleChange} min={today} required />
              </div>
              <div className="form-group">
                <label className="form-label">Time *</label>
                <input name="time" type="time" className="form-input" value={form.time} onChange={handleChange} required />
              </div>
            </div>

            <div className="create-session-grid-2">
              <div className="form-group">
                <label className="form-label">Duration (minutes) *</label>
                <select name="duration" className="form-select" value={form.duration} onChange={handleChange} required>
                  {[30, 45, 60, 90, 120, 150, 180].map(d => (
                    <option key={d} value={d}>{d} min {d >= 60 ? `(${d / 60}h)` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Max Participants *</label>
                <input name="maxParticipants" type="number" className="form-input" value={form.maxParticipants} onChange={handleChange} min={1} max={100} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Meeting Link (optional)</label>
              <input name="meetingLink" type="url" className="form-input" value={form.meetingLink} onChange={handleChange} placeholder="https://meet.google.com/..." />
            </div>

            <div className="form-group">
              <label className="form-label">Lecture Material (optional)</label>
              <input
                type="file"
                className="form-input"
                onChange={handleMaterialChange}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.ppt,.pptx,.txt"
              />
              {lectureMaterial && (
                <div className="create-session-material-name">
                  {lectureMaterial.name}
                </div>
              )}
            </div>

            <div className="create-session-actions">
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" />Creating...</> : 'Create Session'}
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/my-sessions')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
