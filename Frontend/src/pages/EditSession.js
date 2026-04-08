import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import './CreateSession.css';

const toDateInputValue = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function EditSession() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [lectureMaterial, setLectureMaterial] = useState(null);
  const [currentMaterialName, setCurrentMaterialName] = useState('');
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await api.get(`/sessions/${id}`);
        const session = data.session;

        setForm({
          title: session.title || '',
          subject: session.subject || '',
          description: session.description || '',
          date: toDateInputValue(session.date),
          time: toTimeInputValue(session.date),
          duration: session.duration || 60,
          maxParticipants: session.maxParticipants || 10,
          meetingLink: session.meetingLink || '',
        });

        setCurrentMaterialName(session.lectureMaterial?.originalName || session.lectureMaterial?.filename || '');
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load session details.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.date || !form.time) {
      setError('Please select both a date and a time.');
      return;
    }

    const combinedDate = new Date(`${form.date}T${form.time}:00`);
    if (Number.isNaN(combinedDate.getTime())) {
      setError('Please provide a valid date and time.');
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('subject', form.subject);
      payload.append('description', form.description);
      payload.append('date', combinedDate.toISOString());
      payload.append('duration', parseInt(form.duration, 10));
      payload.append('maxParticipants', parseInt(form.maxParticipants, 10));
      payload.append('meetingLink', form.meetingLink);

      if (lectureMaterial) {
        payload.append('lectureMaterial', lectureMaterial);
      }

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
      <DashboardLayout activeSection="Kuppi Sessions" theme="light">
        <div className="container kuppi-page kuppi-page-space-top">
          <div className="sessions-loading-center">
            <div className="spinner spinner-dark sessions-loading-spinner" />
            <p className="sessions-loading-text">Loading session...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeSection="Kuppi Sessions" theme="light">
      <div className="container kuppi-page create-session-page">
        <div className="kuppi-page-header create-session-header">
          <h1 className="kuppi-page-title">Edit Kuppi Session</h1>
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
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input
                  name="subject"
                  className="form-input"
                  value={form.subject}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-textarea"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                />
              </div>

              <div className="create-session-grid-2">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    name="date"
                    type="date"
                    className="form-input"
                    value={form.date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Time *</label>
                  <input
                    name="time"
                    type="time"
                    className="form-input"
                    value={form.time}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="create-session-grid-2">
                <div className="form-group">
                  <label className="form-label">Duration (minutes) *</label>
                  <select name="duration" className="form-select" value={form.duration} onChange={handleChange} required>
                    {[30, 45, 60, 90, 120, 150, 180].map((d) => (
                      <option key={d} value={d}>
                        {d} min {d >= 60 ? `(${d / 60}h)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Max Participants *</label>
                  <input
                    name="maxParticipants"
                    type="number"
                    className="form-input"
                    value={form.maxParticipants}
                    onChange={handleChange}
                    min={1}
                    max={100}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Meeting Link (optional)</label>
                <input
                  name="meetingLink"
                  type="url"
                  className="form-input"
                  value={form.meetingLink}
                  onChange={handleChange}
                  placeholder="https://meet.google.com/..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lecture Material (optional)</label>
                <input
                  type="file"
                  className="form-input"
                  onChange={handleMaterialChange}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.ppt,.pptx,.txt"
                />
                {lectureMaterial && <div className="create-session-material-name">{lectureMaterial.name}</div>}
                {!lectureMaterial && currentMaterialName && (
                  <div className="create-session-material-name">Current: {currentMaterialName}</div>
                )}
              </div>

              <div className="create-session-actions">
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner" />Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate(`/sessions/${id}`)}>
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
