import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { getAdminSmartReminderOverview, getNotifications } from '../../services/notificationService';
import { getAdminStudyItems } from '../../services/studyItemService';
import './AdminSettings.css';

const AdminSettings = () => {
  const { user } = useAuth();
  const isAdmin = ['admin', 'teacher'].includes(String(user?.role || '').toLowerCase());
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [profile, setProfile] = useState({
    adminName: user?.name || 'Alex Sterling',
    role: 'Super Admin',
    email: user?.email || 'alex.sterling@educonnect.edu'
  });

  const [systemPrefs, setSystemPrefs] = useState({
    darkMode: true,
    emailNotifications: true,
    smsAlerts: false
  });

  const [security, setSecurity] = useState({
    twoFactor: true,
    passwordUpdated: '3 months ago'
  });

  const [institution, setInstitution] = useState({
    name: 'EduConnect Global University',
    address: '451 Innovation Way, Tech District, San Francisco, CA 94103',
    dataStorage: 'AWS - US East (N. Virginia)',
    planType: 'Institutional Enterprise'
  });

  const [savedAt, setSavedAt] = useState('Never');
  const [saveError, setSaveError] = useState('');
  const [smartOverview, setSmartOverview] = useState({
    totalStudents: 0,
    inactiveStudents: 0,
    deadlineRiskStudents: 0,
    behindStudents: 0,
    streakStudents: 0,
    items: [],
  });
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [studyMaterialsOverview, setStudyMaterialsOverview] = useState({
    summary: { total: 0, note: 0, bookmark: 0, highlight: 0 },
    data: []
  });

  useEffect(() => {
    let mounted = true;

    const loadLiveData = async () => {
      try {
        const [overviewRes, notificationRes, studyRes] = await Promise.all([
          getAdminSmartReminderOverview(),
          getNotifications(),
          getAdminStudyItems({ limit: 40 }),
        ]);

        if (!mounted) return;

        setSmartOverview((overviewRes && overviewRes.data) || {
          totalStudents: 0,
          inactiveStudents: 0,
          deadlineRiskStudents: 0,
          behindStudents: 0,
          streakStudents: 0,
          items: [],
        });
        setLiveNotifications((notificationRes?.notifications || []).slice(0, 5));
        setStudyMaterialsOverview({
          summary: studyRes?.summary || { total: 0, note: 0, bookmark: 0, highlight: 0 },
          data: studyRes?.data || []
        });
      } catch {
        // Keep admin settings usable if realtime endpoints are temporarily unavailable.
      }
    };

    if (isAdmin) {
      loadLiveData();
      const timer = setInterval(loadLiveData, 20000);
      return () => {
        mounted = false;
        clearInterval(timer);
      };
    }

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const handleSave = () => {
    const adminName = String(profile.adminName || '').trim();
    const role = String(profile.role || '').trim();
    const email = String(profile.email || '').trim();
    const institutionName = String(institution.name || '').trim();
    const institutionAddress = String(institution.address || '').trim();

    if (!adminName) {
      setSaveError('Admin name is required.');
      return;
    }

    if (!role) {
      setSaveError('Role is required.');
      return;
    }

    if (!emailRegex.test(email)) {
      setSaveError('Please enter a valid email address.');
      return;
    }

    if (!institutionName) {
      setSaveError('University name is required.');
      return;
    }

    if (!institutionAddress) {
      setSaveError('Official address is required.');
      return;
    }

    setSaveError('');
    setProfile((prev) => ({ ...prev, adminName, role, email }));
    setInstitution((prev) => ({ ...prev, name: institutionName, address: institutionAddress }));
    setSavedAt(new Date().toLocaleString());
  };

  if (!isAdmin) {
    return (
      <DashboardLayout activeSection="Settings">
        <div className="admin-settings-page">
          <div className="settings-card">
            <h2>Restricted Access</h2>
            <p>Only admin or teacher roles can view the settings control center.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeSection="Settings">
      <div className="admin-settings-page">
        <section className="settings-topline">
          <h1>Settings</h1>
          <p>Configure your institution and profile</p>
        </section>

        <section className="settings-layout-row">
          <article className="panel-card profile-card">
            <div className="panel-head">
              <h2>Profile Settings</h2>
              <button className="btn-primary" onClick={handleSave}>Save Changes</button>
            </div>
            <p className="panel-subtitle">Update your personal account information and identity.</p>
            <div className="profile-grid">
              <div className="profile-avatar-block">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.adminName)}&background=2b344d&color=fff&size=120`}
                  alt={profile.adminName}
                />
                <small>PNG or JPG, max 5MB</small>
              </div>
              <div className="profile-fields">
                <label>
                  Admin Name
                  <input
                    required
                    value={profile.adminName}
                    onChange={(event) => setProfile((prev) => ({ ...prev, adminName: event.target.value }))}
                  />
                </label>
                <label>
                  Role
                  <input
                    required
                    value={profile.role}
                    onChange={(event) => setProfile((prev) => ({ ...prev, role: event.target.value }))}
                  />
                </label>
                <label className="field-span-2">
                  Email Address
                  <input
                    required
                    type="email"
                    value={profile.email}
                    onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </label>
              </div>
            </div>
          </article>

          <article className="panel-card prefs-card">
            <h2>System Preferences</h2>
            <div className="toggle-list">
              <div className="toggle-item">
                <span>Dark Mode</span>
                <button
                  className={`switch-btn ${systemPrefs.darkMode ? 'on' : ''}`}
                  type="button"
                  onClick={() => setSystemPrefs((prev) => ({ ...prev, darkMode: !prev.darkMode }))}
                >
                  <i></i>
                </button>
              </div>
              <div className="toggle-item">
                <span>Email Notifications</span>
                <button
                  className={`switch-btn ${systemPrefs.emailNotifications ? 'on' : ''}`}
                  type="button"
                  onClick={() => setSystemPrefs((prev) => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                >
                  <i></i>
                </button>
              </div>
              <div className="toggle-item">
                <span>SMS Alerts</span>
                <button
                  className={`switch-btn ${systemPrefs.smsAlerts ? 'on' : ''}`}
                  type="button"
                  onClick={() => setSystemPrefs((prev) => ({ ...prev, smsAlerts: !prev.smsAlerts }))}
                >
                  <i></i>
                </button>
              </div>
            </div>
          </article>
        </section>

        <section className="settings-layout-row">
          <article className="panel-card security-card">
            <h2>Security & Access</h2>
            <div className="security-row">
              <div>
                <strong>Change Password</strong>
                <small>Last updated {security.passwordUpdated}</small>
              </div>
              <button className="arrow-btn" type="button">&gt;</button>
            </div>

            <div className="toggle-item security-toggle">
              <span>Two-Factor Authentication</span>
              <button
                className={`switch-btn ${security.twoFactor ? 'on' : ''}`}
                type="button"
                onClick={() => setSecurity((prev) => ({ ...prev, twoFactor: !prev.twoFactor }))}
              >
                <i></i>
              </button>
            </div>

            <div className="sessions-box">
              <div className="sessions-head">
                <span>Active Sessions</span>
                <small>3 Active</small>
              </div>
              <div className="session-item">
                <span>MacOS - Chrome</span>
                <small>Current</small>
              </div>
              <div className="session-item">
                <span>iPhone 14 Pro - Safari</span>
                <button className="revoke-btn" type="button">Revoke</button>
              </div>
            </div>
          </article>

          <article className="panel-card smart-monitor-card">
            <h2>Smart Reminder Monitor</h2>
            <p className="panel-subtitle">Realtime student engagement intelligence across the platform.</p>

            <div className="monitor-metrics-grid">
              <div className="monitor-metric">
                <small>Total Students</small>
                <strong>{smartOverview.totalStudents}</strong>
              </div>
              <div className="monitor-metric">
                <small>Inactive (2+ days)</small>
                <strong>{smartOverview.inactiveStudents}</strong>
              </div>
              <div className="monitor-metric">
                <small>Deadline Risk</small>
                <strong>{smartOverview.deadlineRiskStudents}</strong>
              </div>
              <div className="monitor-metric">
                <small>Behind Progress</small>
                <strong>{smartOverview.behindStudents}</strong>
              </div>
            </div>

            <div className="monitor-list">
              {smartOverview.items.length === 0 ? <small>No high-risk students right now.</small> : null}
              {smartOverview.items.slice(0, 4).map((item) => (
                <div key={item.id} className="monitor-list-item">
                  <strong>{item.name}</strong>
                  <span>
                    Progress {Math.round(Number(item.courseProgressPercent || 0))}% | Inactive {item.inactivityDays ?? 0}d | Streak {item.studyStreak || 0}
                  </span>
                </div>
              ))}
            </div>

            <h3 className="smart-feed-title">Live Notification Feed</h3>
            <div className="smart-feed-list">
              {liveNotifications.length === 0 ? <small>No notifications received yet.</small> : null}
              {liveNotifications.map((item) => (
                <div key={item._id} className="smart-feed-item">
                  <strong>{item.title}</strong>
                  <span>{item.message}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel-card institution-card">
          <div className="panel-head">
            <div>
              <h2>Student Study Materials</h2>
              <p className="panel-subtitle">Track usage of personal notes, bookmarks, and highlights across courses.</p>
            </div>
          </div>

          <div className="monitor-metrics-grid">
            <div className="monitor-metric">
              <small>Total Items</small>
              <strong>{studyMaterialsOverview.summary.total || 0}</strong>
            </div>
            <div className="monitor-metric">
              <small>Notes</small>
              <strong>{studyMaterialsOverview.summary.note || 0}</strong>
            </div>
            <div className="monitor-metric">
              <small>Bookmarks</small>
              <strong>{studyMaterialsOverview.summary.bookmark || 0}</strong>
            </div>
            <div className="monitor-metric">
              <small>Highlights</small>
              <strong>{studyMaterialsOverview.summary.highlight || 0}</strong>
            </div>
          </div>

          <div className="smart-feed-list">
            {studyMaterialsOverview.data.length === 0 ? <small>No study material activity yet.</small> : null}
            {studyMaterialsOverview.data.slice(0, 8).map((item) => (
              <div key={item._id} className="smart-feed-item">
                <strong>{String(item.type || '').toUpperCase()} - {item.title || 'Study item'}</strong>
                <span>
                  {item.user?.name || item.user?.email || 'Student'} | {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-card institution-card">
          <div className="panel-head">
            <div>
              <h2>Institution Details</h2>
              <p className="panel-subtitle">Official university records and public presence.</p>
            </div>
            <button className="btn-secondary" type="button">Edit Public View</button>
          </div>

          <div className="institution-fields">
            <label>
              University Name
              <input
                required
                value={institution.name}
                onChange={(event) => setInstitution((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <label>
              Official Address
              <input
                required
                value={institution.address}
                onChange={(event) => setInstitution((prev) => ({ ...prev, address: event.target.value }))}
              />
            </label>
          </div>

          <div className="institution-footer">
            <div>
              <span>Data Storage</span>
              <strong>{institution.dataStorage}</strong>
            </div>
            <div>
              <span>Plan Type</span>
              <strong>{institution.planType}</strong>
            </div>
            <div className="institution-actions">
              <button className="btn-secondary" type="button">Discard</button>
              <button className="btn-primary" type="button" onClick={handleSave}>Update Institution</button>
            </div>
          </div>
        </section>

        <footer className="settings-footer">
          {saveError ? (
            <div>
              <small>{saveError}</small>
            </div>
          ) : null}
          <div>
            <small>(c) 2026 EduConnect LMS. All administrative rights reserved.</small>
          </div>
          <div>
            <small>Last saved: {savedAt}</small>
            <small>Privacy Policy</small>
            <small>Terms of Service</small>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
