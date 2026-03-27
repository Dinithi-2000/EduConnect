import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AIChatWidget from '../../components/AIChatWidget';
import { API_URL } from '../../services/api';
import { getCourses } from '../../services/courseService';
import '../StudentDashboard.css';
import './StudentMyCourses.css';

const apiOrigin = API_URL.replace(/\/api\/?$/, '');

const StudentMyCourses = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completionMap, setCompletionMap] = useState({});
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const studentId = user?._id || user?.id || 'guest';
  const progressStorageKey = `student-course-progress-${studentId}`;
  const enrollmentStorageKey = `student-course-enrollments-${studentId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(progressStorageKey);
      setCompletionMap(saved ? JSON.parse(saved) : {});
    } catch {
      setCompletionMap({});
    }
  }, [progressStorageKey]);

  useEffect(() => {
    try {
      const savedEnrollments = localStorage.getItem(enrollmentStorageKey);
      setEnrolledCourseIds(savedEnrollments ? JSON.parse(savedEnrollments) : []);
    } catch {
      setEnrolledCourseIds([]);
    }
  }, [enrollmentStorageKey]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getCourses();
        setCourses(response.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load courses.');
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const displayName = user?.name || 'Student';
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const getCourseProgress = (course) => {
    const contents = (course.modules || []).flatMap((module) => module.contents || []);
    const total = contents.length;
    const done = contents.filter((content) => completionMap?.[course._id]?.[content._id]).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, percent };
  };

  const progressByCourseId = useMemo(() => {
    const map = {};
    courses.forEach((course) => {
      map[course._id] = getCourseProgress(course);
    });
    return map;
  }, [courses, completionMap]);

  const activeCourses = useMemo(() => {
    return courses.filter((course) => {
      const percent = progressByCourseId[course._id]?.percent || 0;
      return enrolledCourseIds.includes(course._id) || percent > 0;
    });
  }, [courses, progressByCourseId, enrolledCourseIds]);

  const categories = useMemo(() => {
    const unique = new Set(activeCourses.map((course) => String(course.subject || 'General').trim()).filter(Boolean));
    return ['all', ...Array.from(unique)];
  }, [activeCourses]);

  const filteredCourses = useMemo(() => {
    return activeCourses.filter((course) => {
      const progress = progressByCourseId[course._id] || { percent: 0 };
      const byCategory = categoryFilter === 'all' || String(course.subject || '').trim() === categoryFilter;
      const byStatus =
        statusFilter === 'all' ||
        (statusFilter === 'in-progress' && progress.percent > 0 && progress.percent < 100) ||
        (statusFilter === 'completed' && progress.percent === 100) ||
        (statusFilter === 'not-started' && progress.percent === 0);
      return byCategory && byStatus;
    });
  }, [activeCourses, progressByCourseId, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const progressList = activeCourses.map((course) => progressByCourseId[course._id]?.percent || 0);
    const inProgress = progressList.filter((percent) => percent > 0 && percent < 100).length;
    const completed = progressList.filter((percent) => percent === 100).length;
    const avg = progressList.length
      ? Math.round(progressList.reduce((sum, value) => sum + value, 0) / progressList.length)
      : 0;

    let modulesInProgress = 0;
    let modulesCompleted = 0;

    activeCourses.forEach((course) => {
      (course.modules || []).forEach((module) => {
        const moduleContents = module.contents || [];
        if (!moduleContents.length) return;

        const done = moduleContents.filter((content) => completionMap?.[course._id]?.[content._id]).length;
        const percent = Math.round((done / moduleContents.length) * 100);

        if (percent === 100) {
          modulesCompleted += 1;
        } else if (percent > 0) {
          modulesInProgress += 1;
        }
      });
    });

    return {
      total: activeCourses.length,
      inProgress,
      completed,
      average: avg,
      modulesInProgress,
      modulesCompleted
    };
  }, [activeCourses, progressByCourseId, completionMap]);

  const sidebarItems = [
    { icon: '▦', label: 'Dashboard', route: '/student-dashboard' },
    { icon: '🎓', label: 'My Courses', route: '/student/my-courses', active: true },
    { icon: '📚', label: 'Course & Contents', route: '/student/courses' },
    { icon: '📝', label: 'Quiz & Mock Exams', route: '/student/quizzes' },
    { icon: '🎥', label: 'Kuppi Sessions', route: '/student/courses' },
    { icon: '💬', label: 'Community Board', route: '/student/community' },
    { icon: '📈', label: 'Progress Analytics', route: '/student/progress' },
    { icon: '👑', label: 'Premium', route: '/student/premium' },
    { icon: '🤖', label: 'AI Chatbot', action: () => setChatOpenSignal((prev) => prev + 1) },
    { icon: '⚙', label: 'Settings', route: '/settings' }
  ];

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

  const handleOpenCourse = (courseId, openWorkspace) => {
    navigate('/student/courses', { state: { courseId, openWorkspace } });
  };

  const getThumbnailUrl = (url) => {
    const value = String(url || '').trim();
    if (!value) return '';
    if (value.startsWith('data:image/')) return value;
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('/')) return `${apiOrigin}${value}`;
    return `${apiOrigin}/${value}`;
  };

  return (
    <div className="student-v2-shell student-my-courses-shell">
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

      <main className="student-v2-main my-courses-main">
        <header className="student-v2-topbar">
          <div className="student-v2-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              placeholder="Search for courses..."
              aria-label="Search for courses"
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

        <section className="my-courses-page">
          <div className="my-courses-head">
            <div>
              <h1>My Courses</h1>
              <p>Continue where you left off and manage your academic progress.</p>
            </div>
            <div className="my-courses-filters">
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Progress Status</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="not-started">Not Started</option>
              </select>
            </div>
          </div>

          <div className="my-courses-stats">
            <article className="my-stat-card enrolled">
              <small>Total Enrolled</small>
              <strong>{stats.total}</strong>
              <p>{stats.total > 0 ? `${stats.total} enrolled courses` : 'No enrolled courses yet'}</p>
            </article>
            <article className="my-stat-card progress">
              <small>In Progress</small>
              <strong>{String(stats.inProgress).padStart(2, '0')}</strong>
              <p>{stats.modulesInProgress} modules active</p>
            </article>
            <article className="my-stat-card complete">
              <small>Completed</small>
              <strong>{String(stats.completed).padStart(2, '0')}</strong>
              <p>{stats.modulesCompleted} modules completed</p>
            </article>
            <article className="my-stat-card average">
              <small>Avg. Progress</small>
              <strong>{stats.average}%</strong>
              <div className="avg-track"><div className="avg-fill" style={{ width: `${stats.average}%` }}></div></div>
            </article>
          </div>

          {loading ? (
            <div className="state-box">Loading courses...</div>
          ) : error ? (
            <div className="state-box error">{error}</div>
          ) : (
            <div className="my-courses-grid">
              {filteredCourses.map((course) => {
                const progress = progressByCourseId[course._id] || { total: 0, done: 0, percent: 0 };
                const completed = progress.percent === 100;
                return (
                  <article key={course._id} className="my-course-card">
                    <div
                      className="my-course-cover"
                      style={course.thumbnailUrl ? { backgroundImage: `url(${getThumbnailUrl(course.thumbnailUrl)})` } : undefined}
                    >
                      <span className="my-course-subject">{course.subject || 'General'}</span>
                      {completed ? <span className="my-course-done">Done</span> : null}
                    </div>
                    <div className="my-course-body">
                      <h3>{course.title}</h3>
                      <p className="my-course-instructor">Instructor: {course.createdBy?.name || 'Course Team'}</p>
                      <div className="my-course-progress-row">
                        <small>Course Progress</small>
                        <strong>{progress.percent}%</strong>
                      </div>
                      <div className="my-course-track">
                        <div className="my-course-fill" style={{ width: `${progress.percent}%` }}></div>
                      </div>
                      <div className="my-course-actions">
                        {completed ? (
                          <>
                            <button type="button" className="green-btn">Certificate</button>
                            <button type="button" className="ghost-btn" onClick={() => handleOpenCourse(course._id, false)}>Review</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="blue-btn" onClick={() => handleOpenCourse(course._id, true)}>Continue</button>
                            <button type="button" className="ghost-btn" onClick={() => handleOpenCourse(course._id, false)}>Details</button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}

              <button type="button" className="my-course-add" onClick={() => navigate('/student/courses')}>
                <span>+</span>
                <strong>Enroll in New Course</strong>
                <p>Expand your knowledge and discover new academic fields.</p>
              </button>
            </div>
          )}
        </section>

        <AIChatWidget
          studentId={user?._id || 'guest-student'}
          context={{
            page: 'student-my-courses',
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

export default StudentMyCourses;
