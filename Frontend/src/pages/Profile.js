import React from 'react';
import { useAuth } from '../context/AuthContext';
import ProfileForm from '../components/ProfileForm';

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  const roleBadgeClass = user.role === 'student' ? 'badge-blue' : user.role === 'admin' ? 'badge-purple' : 'badge-green';
  const roleLabel = user.role === 'student' ? 'Student' : user.role === 'admin' ? 'Admin' : 'Tutor';

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div className="page-header">
        <h1 className="page-title">👤 My Profile</h1>
        <p className="page-subtitle">Manage your account information</p>
      </div>

      <div style={styles.layout}>
        {/* Left: Info card */}
        <div style={styles.sidebar}>
          <div className="card card-body" style={{ textAlign: 'center' }}>
            <div style={styles.avatarLarge}>
              {user.profilePicture
                ? <img src={`http://localhost:5000${user.profilePicture}`} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontWeight: 900, color: '#fff', fontSize: 40 }}>{user.name?.charAt(0).toUpperCase()}</span>
              }
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 16 }}>{user.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{user.email}</p>
            <span className={`badge ${roleBadgeClass}`} style={{ marginTop: 10, fontSize: 13 }}>
              {roleLabel}
            </span>

            {user.bio && (
              <p style={{ marginTop: 16, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, textAlign: 'left' }}>{user.bio}</p>
            )}

            {user.subjects?.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {user.subjects.map(s => <span key={s} className="badge badge-blue">{s}</span>)}
              </div>
            )}
          </div>
        </div>

        {/* Right: Edit form */}
        <div style={{ flex: 1 }}>
          <div className="card card-body">
            <h3 style={{ marginBottom: 24, fontSize: 18 }}>Edit Profile</h3>
            <ProfileForm user={user} />
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' },
  sidebar: { width: 260, flexShrink: 0 },
  avatarLarge: { width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', overflow: 'hidden' },
};
