import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProfileForm({ user }) {
  const { updateUser } = useAuth();
  const initialForm = {
    name: user.name || '',
    bio: user.bio || '',
    subjects: Array.isArray(user.subjects) ? user.subjects.join(', ') : '',
  };
  const [form, setForm] = useState({
    ...initialForm,
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(user.profilePicture ? `http://localhost:5000${user.profilePicture}` : '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const hasChanges =
    form.name !== initialForm.name ||
    form.bio !== initialForm.bio ||
    form.subjects !== initialForm.subjects ||
    !!profilePicture;

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB.'); return; }
    setProfilePicture(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('bio', form.bio);
      formData.append('subjects', form.subjects);
      if (profilePicture) formData.append('profilePicture', profilePicture);

      const { data } = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      updateUser(data.user);
      setSuccess('Profile updated successfully!');
      setProfilePicture(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Profile Picture */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {preview
            ? <img src={preview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontWeight: 700, color: '#fff', fontSize: 28 }}>{user.name?.charAt(0).toUpperCase()}</span>
          }
        </div>
        <div>
          <label htmlFor="pic-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            📷 Change Photo
          </label>
          <input id="pic-upload" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>JPG, PNG or WebP. Max 2MB.</p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input name="name" className="form-input" value={form.name} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label className="form-label">Bio</label>
        <textarea name="bio" className="form-textarea" value={form.bio} onChange={handleChange} placeholder="Tell students about yourself..." rows={4} />
      </div>

      {(user.role === 'tutor' || user.role === 'teacher' || user.role === 'admin') && (
        <div className="form-group">
          <label className="form-label">Subjects (comma-separated)</label>
          <input name="subjects" className="form-input" value={form.subjects} onChange={handleChange} placeholder="e.g. Mathematics, Physics, Chemistry" />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>List the subjects you teach, separated by commas.</div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
        <button type="submit" className="btn btn-primary">
          {loading ? <><span className="spinner" />Saving…</> : 'Save Profile'}
        </button>
        {!hasChanges && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No changes yet</span>
        )}
      </div>
    </form>
  );
}
