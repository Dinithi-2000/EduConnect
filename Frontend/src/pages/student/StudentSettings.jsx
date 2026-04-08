import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AIChatWidget from '../../components/AIChatWidget';
import '../StudentDashboard.css';
import './StudentSettings.css';

const SETTINGS_STORAGE_KEY = 'student-settings-preferences';

const StudentSettings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [savedAt, setSavedAt] = useState('Not saved yet');
  const [preferences, setPreferences] = useState({
    darkMode: false,
    emailNotifications: true,
    reminderAlerts: true,
    communityUpdates: true,
    weeklyDigest: false
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setPreferences((prev) => ({ ...prev, ...parsed }));
    } catch {
      // Ignore malformed local storage values.
    }
  }, []);

  const displayName = user?.name || 'Student';
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sidebarItems = [
    { icon: '▦', label: 'Dashboard', route: '/student-dashboard' },
    { icon: '🎓', label: 'My Courses', route: '/student/my-courses' },
    { icon: '📚', label: 'Course & Contents', route: '/student/courses' },
    { icon: '📝', label: 'Quiz & Mock Exams', route: '/student/quizzes' },
    { icon: '🎥', label: 'Kuppi Sessions', route: '/sessions' },
    { icon: '💬', label: 'Community Board', route: '/student/community' },
    { icon: '📈', label: 'Progress Analytics', route: '/student/progress' },
    { icon: '👑', label: 'Premium', route: '/student/premium' },
    { icon: '🤖', label: 'AI Chatbot', action: () => setChatOpenSignal((prev) => prev + 1) },
    { icon: '⚙', label: 'Settings', route: '/settings', active: true }
  ];

  const completion = useMemo(() => {
    const enabledCount = Object.values(preferences).filter(Boolean).length;
    return Math.round((enabledCount / Object.keys(preferences).length) * 100);
  }, [preferences]);

  const handleSidebarAction = (item) => {
    if (item.action) {
      item.action();
      return;
    }
    navigate(item.route);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleToggle = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(preferences));
    setSavedAt(new Date().toLocaleString());
  };

  return (
    <div className="student-v2-shell student-settings-shell">
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
              onClick={() => handleSidebarAction(item)}
            >
              <span className="icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="student-v2-upgrade">
          <p>Unlock all features</p>
          <h3>Upgrade to Pro</h3>
          <button type="button" onClick={() => navigate('/student/premium')}>Upgrade Now</button>
        </div>

        <button type="button" className="student-v2-logout" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="student-v2-main student-settings-main">
        <header className="student-v2-topbar">
          <div className="student-v2-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              placeholder="Search settings, notifications, security..."
              aria-label="Search settings"
            />
          </div>

          <div className="student-v2-tools">
            <button type="button" className="ghost-icon" aria-label="Theme">◐</button>
            <button type="button" className="ghost-icon" aria-label="Notifications">🔔</button>
            <button type="button" className="premium-pill" onClick={() => navigate('/student/premium')}>
              <span aria-hidden="true">👑</span>
              Premium
            </button>
            <div className="student-v2-profile-chip">
              <div className="student-v2-profile-text">
                <strong>{displayName}</strong>
                <small>{user?.email || 'Student account'}</small>
              </div>
              <div className="student-v2-profile-avatar">{initials}</div>
            </div>
          </div>
        </header>

        <div className="student-settings-page">
          <section className="settings-hero-card">
            <div>
              <h1>Settings</h1>
              <p>Control your notifications, privacy preferences, and account experience.</p>
            </div>
            <button type="button" onClick={handleSave}>Save Preferences</button>
          </section>

          <section className="settings-grid">
            <article className="settings-card account-card">
              <h2>Account Profile</h2>
              <div className="account-row">
                <span>Name</span>
                <strong>{displayName}</strong>
              </div>
              <div className="account-row">
                <span>Email</span>
                <strong>{user?.email || 'Not available'}</strong>
              </div>
              <div className="account-row">
                <span>Role</span>
                <strong>{user?.role || 'student'}</strong>
              </div>
              <div className="account-row">
                <span>Last Saved</span>
                <strong>{savedAt}</strong>
              </div>
            </article>

            <article className="settings-card toggles-card">
              <h2>Preferences</h2>
              <div className="toggle-list-student">
                <div className="toggle-item-student">
                  <div>
                    <strong>Dark Mode</strong>
                    <small>Switch to darker surfaces on this device</small>
                  </div>
                  <button type="button" className={`switch-btn ${preferences.darkMode ? 'on' : ''}`} onClick={() => handleToggle('darkMode')}>
                    <i></i>
                  </button>
                </div>

                <div className="toggle-item-student">
                  <div>
                    <strong>Email Notifications</strong>
                    <small>Receive new quiz and content alerts by email</small>
                  </div>
                  <button type="button" className={`switch-btn ${preferences.emailNotifications ? 'on' : ''}`} onClick={() => handleToggle('emailNotifications')}>
                    <i></i>
                  </button>
                </div>

                <div className="toggle-item-student">
                  <div>
                    <strong>Reminder Alerts</strong>
                    <small>Get reminders for upcoming quizzes and deadlines</small>
                  </div>
                  <button type="button" className={`switch-btn ${preferences.reminderAlerts ? 'on' : ''}`} onClick={() => handleToggle('reminderAlerts')}>
                    <i></i>
                  </button>
                </div>

                <div className="toggle-item-student">
                  <div>
                    <strong>Community Updates</strong>
                    <small>Receive notifications when discussions are active</small>
                  </div>
                  <button type="button" className={`switch-btn ${preferences.communityUpdates ? 'on' : ''}`} onClick={() => handleToggle('communityUpdates')}>
                    <i></i>
                  </button>
                </div>

                <div className="toggle-item-student">
                  <div>
                    <strong>Weekly Digest</strong>
                    <small>Weekly summary of progress and recommended actions</small>
                  </div>
                  <button type="button" className={`switch-btn ${preferences.weeklyDigest ? 'on' : ''}`} onClick={() => handleToggle('weeklyDigest')}>
                    <i></i>
                  </button>
                </div>
              </div>
            </article>
          </section>

          <section className="settings-grid secondary">
            <article className="settings-card privacy-card">
              <h2>Privacy & Security</h2>
              <div className="security-item">
                <div>
                  <strong>Password</strong>
                  <small>Update your password regularly to keep your account secure.</small>
                </div>
                <button type="button">Change Password</button>
              </div>
              <div className="security-item">
                <div>
                  <strong>Session Management</strong>
                  <small>Review active sessions and remove unknown devices.</small>
                </div>
                <button type="button">Manage Sessions</button>
              </div>
            </article>

            <article className="settings-card summary-card">
              <h2>Preference Status</h2>
              <p>{completion}% of smart preferences are currently enabled.</p>
              <div className="summary-track">
                <div className="summary-fill" style={{ width: `${completion}%` }}></div>
              </div>
              <button type="button" onClick={handleSave}>Save All Settings</button>
            </article>
          </section>
        </div>

        <AIChatWidget
          studentId={user?._id || 'guest-student'}
          context={{
            page: 'student-settings',
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
};

export default StudentSettings;
