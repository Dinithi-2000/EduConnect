import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('Overview');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { icon: '📊', label: 'Overview' },
    { icon: '👥', label: 'Users' },
    { icon: '📚', label: 'Courses' },
    { icon: '📝', label: 'Quizzes' },
    { icon: '🎥', label: 'Sessions' },
    { icon: '📈', label: 'Reports' },
  ];

  const statsData = [
    { icon: '👥', title: 'Total Students', value: '1,240', badge: '+32', badgeColor: '#10b981' },
    { icon: '📚', title: 'Active Courses', value: '48', badge: '+3', badgeColor: '#6366f1' },
    { icon: '🎥', title: 'Live Sessions', value: '12', badge: 'Today', badgeColor: '#f59e0b' },
    { icon: '📝', title: 'Quizzes Published', value: '186', badge: '+8', badgeColor: '#10b981' },
  ];

  const recentUsers = [
    { name: 'Anjali Silva', email: 'anjali@edu.lk', role: 'student', joined: '2 hours ago' },
    { name: 'Kamal Perera', email: 'kamal@edu.lk', role: 'student', joined: '5 hours ago' },
    { name: 'Nimal Fernando', email: 'nimal@edu.lk', role: 'student', joined: '1 day ago' },
    { name: 'Saman Wijesinghe', email: 'saman@edu.lk', role: 'student', joined: '2 days ago' },
  ];

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <span className="admin-logo-icon">🎓</span>
            <span className="admin-logo-text">EduConnect</span>
          </div>
          <span className="admin-badge">Admin</span>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <div
              key={item.label}
              className={`admin-nav-item ${activeNav === item.label ? 'active' : ''}`}
              onClick={() => setActiveNav(item.label)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div
            className="admin-nav-item"
            role="button"
            tabIndex={0}
            onClick={handleLogout}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleLogout();
              }
            }}
          >
            <span className="admin-nav-icon">🚪</span>
            <span className="admin-nav-label">Logout</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div>
            <h1 className="admin-page-title">Admin Dashboard</h1>
            <p className="admin-page-subtitle">Manage your platform</p>
          </div>
          <div className="admin-header-user">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=6366f1&color=fff`}
              alt={user?.name}
              className="admin-avatar"
            />
            <div className="admin-user-info">
              <span className="admin-user-name">{user?.name}</span>
              <span className="admin-user-role">Administrator</span>
            </div>
          </div>
        </header>

        {/* Stats */}
        <section className="admin-stats-grid">
          {statsData.map((stat) => (
            <div key={stat.title} className="admin-stat-card">
              <div className="admin-stat-icon">{stat.icon}</div>
              <div className="admin-stat-content">
                <h3 className="admin-stat-title">{stat.title}</h3>
                <p className="admin-stat-value">{stat.value}</p>
              </div>
              <span className="admin-stat-badge" style={{ backgroundColor: stat.badgeColor }}>
                {stat.badge}
              </span>
            </div>
          ))}
        </section>

        {/* Recent Users Table */}
        <section className="admin-section">
          <div className="admin-section-header">
            <h2 className="admin-section-title">Recent Registrations</h2>
            <button className="admin-view-all-btn">View all</button>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.email}>
                    <td>
                      <div className="admin-table-user">
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=6366f1&color=fff&size=32`}
                          alt={u.name}
                          className="admin-table-avatar"
                        />
                        {u.name}
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-chip role-${u.role}`}>{u.role}</span>
                    </td>
                    <td>{u.joined}</td>
                    <td>
                      <button className="admin-action-btn">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
