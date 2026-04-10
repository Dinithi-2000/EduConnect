import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AIChatWidget from '../../components/AIChatWidget';
import {
  getNotifications,
  getSmartReminderInsights,
  getSmartReminderSettings,
  updateSmartReminderSettings,
} from '../../services/notificationService';
import '../StudentDashboard.css';
import './StudentSettings.css';

const SETTINGS_STORAGE_KEY = 'student-settings-preferences';

const StudentSettings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [savedAt, setSavedAt] = useState('Not saved yet');
  const [saveNotice, setSaveNotice] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [smartReminderPrefs, setSmartReminderPrefs] = useState({
    enabled: true,
    inactivity: true,
    deadline: true,
    lowProgress: true,
    streak: true,
  });
  const [smartInsights, setSmartInsights] = useState({
    lastStudyAt: null,
    courseProgressPercent: 0,
    studyStreak: 0,
    inactivityDays: null,
    nextDeadlineAt: null,
  });
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

  useEffect(() => {
    let mounted = true;

    const loadSmartReminderData = async () => {
      try {
        const [settingsRes, insightsRes, notificationsRes] = await Promise.all([
          getSmartReminderSettings(),
          getSmartReminderInsights(),
          getNotifications(),
        ]);

        if (!mounted) return;

        setSmartReminderPrefs((prev) => ({
          ...prev,
          ...(settingsRes?.data?.preferences || {}),
        }));

        setSmartInsights((prev) => ({
          ...prev,
          ...(insightsRes?.data || {}),
        }));

        setUnreadCount(Number(notificationsRes?.unreadCount || 0));
        setRecentNotifications((notificationsRes?.notifications || []).slice(0, 4));
      } catch {
        // Keep settings page usable if the live reminder API is temporarily unavailable.
      }
    };

    loadSmartReminderData();
    const timer = setInterval(loadSmartReminderData, 20000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
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
    setSaveNotice('Preferences saved on this device.');
  };

  const handleSaveAllSettings = async () => {
    try {
      await updateSmartReminderSettings({
        preferences: smartReminderPrefs,
      });
      handleSave();
      setSaveNotice('Smart reminder settings synced successfully.');
    } catch {
      setSaveNotice('Saved locally, but smart reminder sync failed.');
    }
  };

  const toggleSmartReminderPref = (key) => {
    setSmartReminderPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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
            <button type="button" className="ghost-icon" aria-label="Notifications">
              🔔
              {unreadCount > 0 ? <span className="settings-notif-badge">{Math.min(unreadCount, 99)}</span> : null}
            </button>
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
              <button type="button" onClick={handleSaveAllSettings}>Save All Settings</button>
            </article>
          </section>

          <section className="settings-grid secondary">
            <article className="settings-card smart-reminder-card">
              <h2>Smart Reminder System</h2>
              <div className="toggle-list-student">
                <div className="toggle-item-student">
                  <div>
                    <strong>Enable Smart Reminders</strong>
                    <small>Allow intelligent study reminders in real time</small>
                  </div>
                  <button type="button" className={`switch-btn ${smartReminderPrefs.enabled ? 'on' : ''}`} onClick={() => toggleSmartReminderPref('enabled')}>
                    <i></i>
                  </button>
                </div>
                <div className="toggle-item-student">
                  <div>
                    <strong>Inactivity Alerts</strong>
                    <small>Warn after 2+ days without studying</small>
                  </div>
                  <button type="button" className={`switch-btn ${smartReminderPrefs.inactivity ? 'on' : ''}`} onClick={() => toggleSmartReminderPref('inactivity')}>
                    <i></i>
                  </button>
                </div>
                <div className="toggle-item-student">
                  <div>
                    <strong>Deadline Alerts</strong>
                    <small>Notify when deadlines are within 24 hours</small>
                  </div>
                  <button type="button" className={`switch-btn ${smartReminderPrefs.deadline ? 'on' : ''}`} onClick={() => toggleSmartReminderPref('deadline')}>
                    <i></i>
                  </button>
                </div>
                <div className="toggle-item-student">
                  <div>
                    <strong>Low Progress Nudges</strong>
                    <small>Detect when progress is behind pace</small>
                  </div>
                  <button type="button" className={`switch-btn ${smartReminderPrefs.lowProgress ? 'on' : ''}`} onClick={() => toggleSmartReminderPref('lowProgress')}>
                    <i></i>
                  </button>
                </div>
                <div className="toggle-item-student">
                  <div>
                    <strong>Streak Motivation</strong>
                    <small>Celebrate consistent daily learning streaks</small>
                  </div>
                  <button type="button" className={`switch-btn ${smartReminderPrefs.streak ? 'on' : ''}`} onClick={() => toggleSmartReminderPref('streak')}>
                    <i></i>
                  </button>
                </div>
              </div>
            </article>

            <article className="settings-card smart-insights-card">
              <h2>Live Study Insights</h2>
              <div className="account-row">
                <span>Last Study</span>
                <strong>{smartInsights.lastStudyAt ? new Date(smartInsights.lastStudyAt).toLocaleString() : 'No activity yet'}</strong>
              </div>
              <div className="account-row">
                <span>Course Progress</span>
                <strong>{Math.round(Number(smartInsights.courseProgressPercent || 0))}%</strong>
              </div>
              <div className="account-row">
                <span>Study Streak</span>
                <strong>{Number(smartInsights.studyStreak || 0)} day(s)</strong>
              </div>
              <div className="account-row">
                <span>Days Inactive</span>
                <strong>{smartInsights.inactivityDays ?? 0}</strong>
              </div>
              <div className="account-row">
                <span>Live Notifications</span>
                <strong>{unreadCount} unread</strong>
              </div>
              <div className="live-notification-feed">
                {recentNotifications.length === 0 ? <small>No notifications yet.</small> : null}
                {recentNotifications.map((item) => (
                  <div key={item._id} className="live-notification-item">
                    <strong>{item.title}</strong>
                    <span>{item.message}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          {saveNotice ? <p className="settings-save-notice">{saveNotice}</p> : null}
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
