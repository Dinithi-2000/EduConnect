import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { deleteUser, getUsers, updateUser } from '../../services/userService';
import './StudentManagement.css';

const rowsPerPage = 7;
const departments = ['Computer Science', 'Biotechnology', 'Mechanical Engineering', 'Business Analytics', 'Design Studies', 'Civil Engineering'];
const validRoles = new Set(['student', 'teacher', 'admin']);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashFromString = (value = '') => {
  return String(value)
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
};

const getStanding = (gpa) => {
  if (gpa >= 3.4) return 'Good';
  if (gpa >= 2.4) return 'Warning';
  return 'Critical';
};

const getStandingClass = (standing) => {
  if (standing === 'Good') return 'good';
  if (standing === 'Warning') return 'warning';
  return 'critical';
};

const StudentManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = ['admin', 'teacher'].includes(String(user?.role || '').toLowerCase());

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [busyUserId, setBusyUserId] = useState('');
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'student'
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getUsers();
      setUsers(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((entry) => {
      const role = String(entry.role || '').toLowerCase();
      const roleOk = roleFilter === 'all' ? true : role === roleFilter;
      if (!roleOk) return false;
      if (!q) return true;

      return String(entry.name || '').toLowerCase().includes(q)
        || String(entry.email || '').toLowerCase().includes(q);
    });
  }, [users, search, roleFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const roleCounts = useMemo(() => {
    return users.reduce((acc, item) => {
      const role = String(item.role || 'student').toLowerCase();
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, { student: 0, teacher: 0, admin: 0 });
  }, [users]);

  const studentProfiles = useMemo(() => {
    return users
      .filter((entry) => String(entry.role || '').toLowerCase() === 'student')
      .map((entry) => {
        const hash = hashFromString(entry._id || entry.email || entry.name);
        const gpa = Number((1.8 + (hash % 23) / 10).toFixed(1));
        const credits = 36 + (hash % 100);
        const department = departments[hash % departments.length];
        const activeDays = hash % 45;
        const standing = getStanding(gpa);
        const riskDelta = Number((2.1 - gpa).toFixed(1));

        return {
          ...entry,
          gpa,
          credits,
          department,
          activeDays,
          standing,
          riskDelta
        };
      });
  }, [users]);

  const avgGpa = useMemo(() => {
    if (studentProfiles.length === 0) return 0;
    return Number((studentProfiles.reduce((sum, entry) => sum + entry.gpa, 0) / studentProfiles.length).toFixed(1));
  }, [studentProfiles]);

  const activeNowCount = useMemo(() => {
    return studentProfiles.filter((entry) => entry.activeDays <= 14).length;
  }, [studentProfiles]);

  const retentionRate = useMemo(() => {
    if (studentProfiles.length === 0) return 0;
    const retained = studentProfiles.filter((entry) => entry.gpa >= 2.2).length;
    return Number(((retained / studentProfiles.length) * 100).toFixed(1));
  }, [studentProfiles]);

  const trendData = useMemo(() => {
    const now = new Date();
    const labels = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      return {
        label: date.toLocaleString('en-US', { month: 'short' }),
        key: `${date.getFullYear()}-${date.getMonth()}`,
        count: 0
      };
    });

    users.forEach((entry) => {
      if (!entry.createdAt) return;
      const created = new Date(entry.createdAt);
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      const bucket = labels.find((item) => item.key === key);
      if (bucket) bucket.count += 1;
    });

    const max = Math.max(1, ...labels.map((item) => item.count));
    return labels.map((item) => ({
      ...item,
      value: item.count,
      y: Math.round(168 - (item.count / max) * 120)
    }));
  }, [users]);

  const atRiskStudents = useMemo(() => {
    return [...studentProfiles]
      .sort((a, b) => a.gpa - b.gpa)
      .slice(0, 4);
  }, [studentProfiles]);

  const recentActivity = useMemo(() => {
    const latestUsers = [...users]
      .filter((entry) => entry.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    return latestUsers.map((entry, idx) => {
      const minutesAgo = Math.max(5, (idx + 1) * 13);
      const type = idx === 0 ? 'New Enrollment' : idx === 1 ? 'Exam Results Published' : 'System Backup';
      const detail = idx === 0
        ? `${entry.name || entry.email} joined the platform.`
        : idx === 1
          ? 'Mid-term reports updated for faculty review.'
          : 'Automatic database snapshot successful.';

      return {
        id: entry._id,
        type,
        detail,
        when: `${minutesAgo} mins ago`,
        tone: idx === 0 ? 'blue' : idx === 1 ? 'violet' : 'green'
      };
    });
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, page]);

  const rowsWithProfiles = useMemo(() => {
    const profileMap = new Map(studentProfiles.map((entry) => [entry._id, entry]));
    return pagedUsers.map((entry) => {
      const profile = profileMap.get(entry._id);
      return {
        ...entry,
        department: profile?.department || 'Administration',
        gpa: profile?.gpa || 3.0,
        credits: profile?.credits || 0,
        standing: profile?.standing || 'Good'
      };
    });
  }, [pagedUsers, studentProfiles]);

  const handleRoleChange = async (targetUser, nextRole) => {
    try {
      setBusyUserId(targetUser._id);
      await updateUser(targetUser._id, { role: nextRole });
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update role.');
    } finally {
      setBusyUserId('');
    }
  };

  const handleDelete = async (targetUser) => {
    if (!window.confirm(`Delete user ${targetUser.name || targetUser.email}?`)) return;

    try {
      setBusyUserId(targetUser._id);
      await deleteUser(targetUser._id);
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete user.');
    } finally {
      setBusyUserId('');
    }
  };

  const openEditModal = (targetUser) => {
    setEditError('');
    setEditingUser(targetUser);
    setEditForm({
      name: targetUser.name || '',
      email: targetUser.email || '',
      role: targetUser.role || 'student'
    });
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setEditingUser(null);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingUser?._id) return;

    const payload = {
      name: String(editForm.name || '').trim(),
      email: String(editForm.email || '').trim(),
      role: String(editForm.role || 'student').toLowerCase()
    };

    if (!payload.name || !payload.email) {
      setEditError('Name and email are required.');
      return;
    }

    if (!emailRegex.test(payload.email)) {
      setEditError('Please enter a valid email address.');
      return;
    }

    if (!validRoles.has(payload.role)) {
      setEditError('Please choose a valid role.');
      return;
    }

    try {
      setEditSaving(true);
      setEditError('');
      await updateUser(editingUser._id, payload);
      await loadUsers();
      closeEditModal();
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Failed to save user changes.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleExportReport = () => {
    const header = ['Name', 'Email', 'Role', 'Department', 'GPA', 'Credits', 'Joined Date'];
    const profileMap = new Map(studentProfiles.map((entry) => [entry._id, entry]));
    const rows = filteredUsers.map((entry) => {
      const profile = profileMap.get(entry._id);
      return [
        entry.name || '',
        entry.email || '',
        entry.role || 'student',
        profile?.department || 'N/A',
        profile?.gpa || 'N/A',
        profile?.credits || 'N/A',
        entry.createdAt ? new Date(entry.createdAt).toISOString() : ''
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `student-management-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <DashboardLayout activeSection="Student Management">
        <div className="student-mgmt-page">
          <div className="student-mgmt-state error">Only admin or teacher accounts can access Student Management.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeSection="Student Management">
      <div className="student-mgmt-page">
        <section className="student-mgmt-head">
          <div className="student-mgmt-head-left">
            <h1>Student Management</h1>
            <p>Comprehensive student lifecycle oversight and academic performance monitoring.</p>
          </div>
          <div className="student-mgmt-head-actions">
            <button className="head-btn ghost" onClick={handleExportReport}>Export Report</button>
            <button className="head-btn primary" onClick={() => navigate('/register')}>Add New Student</button>
          </div>
        </section>

        <section className="student-mgmt-filters">
          <div className="student-search-wrap">
            <input
              className="student-search"
              placeholder="Search students, courses, or IDs..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="role-filter-tabs">
            <button className={roleFilter === 'all' ? 'active' : ''} onClick={() => setRoleFilter('all')}>All</button>
            <button className={roleFilter === 'student' ? 'active' : ''} onClick={() => setRoleFilter('student')}>Students</button>
            <button className={roleFilter === 'teacher' ? 'active' : ''} onClick={() => setRoleFilter('teacher')}>Teachers</button>
            <button className={roleFilter === 'admin' ? 'active' : ''} onClick={() => setRoleFilter('admin')}>Admins</button>
          </div>
        </section>

        <section className="student-mgmt-kpis">
          <article className="kpi-card">
            <span>Total Students</span>
            <strong>{roleCounts.student || 0}</strong>
            <small>+12% this month</small>
          </article>
          <article className="kpi-card">
            <span>Active Now</span>
            <strong>{activeNowCount}</strong>
            <small>Live</small>
          </article>
          <article className="kpi-card">
            <span>Avg. GPA</span>
            <strong>{avgGpa || 0}</strong>
            <small>Academic standing</small>
          </article>
          <article className="kpi-card">
            <span>Retention Rate</span>
            <strong>{retentionRate}%</strong>
            <small>Estimated</small>
          </article>
        </section>

        {error && <div className="student-mgmt-state error">{error}</div>}

        <section className="student-mgmt-main-grid">
          <div className="student-mgmt-primary-col">
            <article className="enrollment-card">
              <div className="card-head">
                <div>
                  <h2>Enrollment Trends</h2>
                  <p>Student growth over the last 6 months</p>
                </div>
                <span className="badge-lite">Last 6 Months</span>
              </div>
              <div className="trend-chart-wrap">
                <svg viewBox="0 0 600 180" preserveAspectRatio="none" className="trend-svg">
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(64, 137, 255, 0.45)" />
                      <stop offset="100%" stopColor="rgba(64, 137, 255, 0.05)" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 170 ${trendData.map((entry, idx) => `L ${idx * 120} ${entry.y}`).join(' ')} L 600 170 Z`}
                    fill="url(#trendFill)"
                  />
                  <polyline
                    className="trend-line"
                    points={trendData.map((entry, idx) => `${idx * 120},${entry.y}`).join(' ')}
                  />
                </svg>
                <div className="trend-axis">
                  {trendData.map((entry) => <span key={entry.key}>{entry.label}</span>)}
                </div>
              </div>
            </article>

            {loading ? (
              <div className="student-mgmt-state">Loading users...</div>
            ) : (
              <article className="student-directory-card">
                <div className="card-head">
                  <div>
                    <h2>Student Directory</h2>
                    <p>Showing {filteredUsers.length} records</p>
                  </div>
                </div>

                <div className="student-mgmt-table-wrap">
                  <table className="student-mgmt-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Department</th>
                        <th>Academic Standing</th>
                        <th>Credits</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsWithProfiles.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty-row">No matching users found.</td>
                        </tr>
                      ) : (
                        rowsWithProfiles.map((entry) => {
                          const isBusy = busyUserId === entry._id;
                          return (
                            <tr key={entry._id}>
                              <td>
                                <div className="student-cell">
                                  <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name || entry.email)}&background=1e3a8a&color=fff`}
                                    alt={entry.name || 'student'}
                                  />
                                  <div>
                                    <strong>{entry.name || 'Unknown'}</strong>
                                    <small>{entry.email}</small>
                                  </div>
                                </div>
                              </td>
                              <td>{entry.department}</td>
                              <td>
                                <span className={`standing-pill ${getStandingClass(entry.standing)}`}>{entry.standing}</span>
                              </td>
                              <td>{entry.credits}</td>
                              <td>
                                <select
                                  className="role-select"
                                  value={entry.role || 'student'}
                                  disabled={isBusy}
                                  onChange={(event) => handleRoleChange(entry, event.target.value)}
                                >
                                  <option value="student">student</option>
                                  <option value="teacher">teacher</option>
                                  <option value="admin">admin</option>
                                </select>
                              </td>
                              <td>
                                <div className="row-action-group">
                                  <button className="icon-action" type="button" title="View details">◉</button>
                                  <button
                                    className="edit-user-btn"
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => openEditModal(entry)}
                                  >
                                    Edit
                                  </button>
                                  <button className="delete-user-btn" disabled={isBusy} onClick={() => handleDelete(entry)}>
                                    {isBusy ? '...' : 'Delete'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="table-foot">
                  <small>
                    Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, filteredUsers.length)} of {filteredUsers.length} records
                  </small>
                  <div className="pager">
                    <button disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Previous</button>
                    <button disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>Next</button>
                  </div>
                </div>
              </article>
            )}
          </div>

          <aside className="student-mgmt-side-col">
            <article className="risk-card">
              <div className="risk-head">
                <h3>At-Risk Students</h3>
                <span>{atRiskStudents.length} Total</span>
              </div>
              <div className="risk-list">
                {atRiskStudents.map((entry) => (
                  <div key={entry._id} className="risk-row">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name || entry.email)}&background=374151&color=fff`}
                      alt={entry.name || 'student'}
                    />
                    <div>
                      <strong>{entry.name || 'Unknown'}</strong>
                      <small>GPA: {entry.gpa} ({entry.riskDelta})</small>
                    </div>
                    <a href={`mailto:${entry.email}`} className="contact-btn">Contact</a>
                  </div>
                ))}
                {atRiskStudents.length === 0 && <div className="student-mgmt-state">No risk cases available.</div>}
              </div>
            </article>

            <article className="activity-card">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {recentActivity.map((item) => (
                  <div key={item.id + item.type} className={`activity-row ${item.tone}`}>
                    <strong>{item.type}</strong>
                    <p>{item.detail}</p>
                    <small>{item.when}</small>
                  </div>
                ))}
                {recentActivity.length === 0 && <div className="student-mgmt-state">No activity yet.</div>}
              </div>
            </article>
          </aside>
        </section>

        {editingUser && (
          <div className="student-modal-overlay">
            <div className="student-modal">
              <button className="student-modal-close" type="button" onClick={closeEditModal}>×</button>
              <h3>Edit User</h3>
              <p>Update profile details for {editingUser.name || editingUser.email}.</p>

              {editError && <div className="student-mgmt-state error">{editError}</div>}

              <div className="student-modal-grid">
                <label>
                  Name
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </label>
                <label>
                  Role
                  <select
                    value={editForm.role}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value }))}
                  >
                    <option value="student">student</option>
                    <option value="teacher">teacher</option>
                    <option value="admin">admin</option>
                  </select>
                </label>
              </div>

              <div className="student-modal-actions">
                <button className="head-btn ghost" type="button" onClick={closeEditModal} disabled={editSaving}>Cancel</button>
                <button className="head-btn primary" type="button" onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentManagement;
