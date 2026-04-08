import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileForm from '../components/ProfileForm';
import { deleteUser } from '../services/userService';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  if (!user) return null;

  const roleBadgeClass = user.role === 'student' ? 'badge-blue' : user.role === 'admin' ? 'badge-purple' : 'badge-green';
  const roleLabel = user.role === 'student' ? 'Student' : user.role === 'admin' ? 'Admin' : 'Tutor';
  const userId = user._id || user.id;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
    if (!confirmed) return;

    setActionError('');
    setDeleting(true);

    try {
      await deleteUser(userId);
      logout();
      navigate('/register');
    } catch (error) {
      setActionError(error.response?.data?.message || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="container kuppi-page kuppi-page-space profile-page">
      <div className="page-header profile-page-header">
        <h1 className="page-title">👤 My Profile</h1>
        <p className="page-subtitle">Manage your account information</p>
      </div>

      <div className="profile-layout">
        <div className="profile-sidebar">
          <div className="card card-body profile-info-card">
            <div className="profile-avatar-large">
              {user.profilePicture
                ? <img src={`http://localhost:5000${user.profilePicture}`} alt="avatar" className="profile-avatar-image" />
                : <span className="profile-avatar-fallback">{user.name?.charAt(0).toUpperCase()}</span>
              }
            </div>
            <h2 className="profile-name">{user.name}</h2>
            <p className="profile-email">{user.email}</p>
            <span className={`badge profile-role-badge ${roleBadgeClass}`}>
              {roleLabel}
            </span>

            <Link to="/vision-board" className="btn btn-secondary profile-vision-btn">
              Vision Board
            </Link>

            <div className="profile-account-actions">
              <button type="button" className="btn btn-outline profile-action-btn" onClick={handleLogout}>
                Logout
              </button>
              <button type="button" className="btn profile-action-btn profile-delete-btn" onClick={handleDeleteAccount} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>

            {actionError && <div className="alert alert-error profile-action-error">{actionError}</div>}

            {user.bio && (
              <p className="profile-bio">{user.bio}</p>
            )}

            {user.subjects?.length > 0 && (
              <div className="profile-subjects">
                {user.subjects.map(s => <span key={s} className="badge badge-blue">{s}</span>)}
              </div>
            )}
          </div>
        </div>

        <div className="profile-form-panel">
          <div className="card card-body">
            <h3 className="profile-edit-title">Edit Profile</h3>
            <ProfileForm user={user} />
          </div>
        </div>
      </div>
    </div>
  );
}
