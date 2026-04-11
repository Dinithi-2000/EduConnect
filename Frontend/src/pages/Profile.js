import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileForm from '../components/ProfileForm';
import AIChatWidget from '../components/AIChatWidget';
import NotificationBell from '../components/NotificationBell';
import { buildStudentSidebarItems } from '../utils/studentSidebar';
import { deleteUser } from '../services/userService';
import DashboardLayout from '../components/DashboardLayout';
import './StudentDashboard.css';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const isAdminView = ['admin', 'teacher'].includes(role);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  if (!user) return null;

  const roleBadgeClass = user.role === 'student' ? 'badge-blue' : user.role === 'admin' ? 'badge-purple' : 'badge-green';
  const roleLabel = user.role === 'student' ? 'Student' : user.role === 'admin' ? 'Admin' : 'Tutor';
  const userId = user._id || user.id;
  const sidebarItems = buildStudentSidebarItems('', () => setChatOpenSignal((prev) => prev + 1));

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

  if (isAdminView) {
    return (
      <DashboardLayout activeSection="Settings" theme="dark">
        <div className="container kuppi-page kuppi-page-space profile-page admin-profile-theme">
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
                    {user.subjects.map((s) => <span key={s} className="badge badge-blue">{s}</span>)}
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
      </DashboardLayout>
    );
  }

  return (
    <div className="student-v2-shell student-profile-shell">
      <aside className="student-v2-sidebar">
        <div className="student-v2-brand">
          <span className="brand-mark">E</span>
          <div className="brand-copy">
            <h1>EDUCONNECT</h1>
            <small>Academic Portal</small>
          </div>
        </div>

        <nav className="student-v2-nav" aria-label="Student navigation">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`student-v2-nav-item ${item.active ? 'active' : ''}`}
              onClick={() => {
                if (item.action) {
                  item.action();
                  return;
                }
                navigate(item.route);
              }}
            >
              <span className="icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button type="button" className="student-v2-logout" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="student-v2-main">
        <header className="student-v2-topbar">
          <div className="student-v2-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input type="text" placeholder="Search resources..." aria-label="Search resources" />
          </div>

          <div className="student-v2-tools">
            <button type="button" className="ghost-icon" aria-label="Theme">◐</button>
            <NotificationBell />
            <div className="student-v2-profile-chip">
              <div className="student-v2-profile-text">
                <strong>{user.name}</strong>
                <small>{user.email || 'Student account'}</small>
              </div>
              <div className="student-v2-profile-avatar">{user.name?.charAt(0).toUpperCase()}</div>
            </div>
          </div>
        </header>

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
                    {user.subjects.map((s) => <span key={s} className="badge badge-blue">{s}</span>)}
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

        <AIChatWidget
          studentId={user?._id || 'guest-student'}
          context={{
            page: 'student-profile',
            user: {
              id: user?._id,
              name: user?.name,
              role: user?.role
            }
          }}
          openSignal={chatOpenSignal}
        />
      </main>
    </div>
  );
}
