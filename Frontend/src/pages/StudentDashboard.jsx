import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AIChatWidget from '../components/AIChatWidget';
import { getMyProgress } from '../services/quizService';
import './StudentDashboard.css';

const useCountUp = (target, duration = 900, enabled = true) => {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }

    let animationFrame;
    const startTime = performance.now();

    const animate = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * easedProgress));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration, enabled]);

  return value;
};

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [weeklyAttempts, setWeeklyAttempts] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState('');
  const [chartTooltip, setChartTooltip] = useState(null);
  const chartWrapRef = useRef(null);

  const upcomingClasses = [
    {
      id: 1,
      course: 'Data Structures & Recursion',
      time: 'Today at 4:30 PM',
      duration: '1h 42m joined',
      instructor: 'Ary Amelia Rajakariuna',
      status: 'in 5 minutes'
    },
    {
      id: 2,
      course: 'Advanced Database Systems',
      time: 'Tomorrow, 10:00 AM',
      duration: '45 min session',
      instructor: 'Jane Smith',
      status: 'scheduled'
    },
    {
      id: 3,
      course: 'Web Development Studio',
      time: 'Friday, 2:00 PM',
      duration: '90 min session',
      instructor: 'Mike Johnson',
      status: 'scheduled'
    }
  ];

  const recentMaterials = [
    {
      id: 1,
      title: 'Data Structures - Lecture Notes',
      meta: 'Week 04 - PDF Document'
    },
    {
      id: 2,
      title: 'Algorithm Complexity Fundamentals',
      meta: 'Week 03 - Video Lecture'
    }
  ];

  const campusBuzz = [
    {
      id: 1,
      tag: 'Lost & Found',
      text: 'Black Dell laptop charger found in the main library study area.',
      age: '7h ago'
    },
    {
      id: 2,
      tag: 'Campus Event',
      text: 'Inter-faculty Hackathon 2023: Registration closes this Friday!',
      age: '1d ago'
    }
  ];

  const displayName = user?.name || 'Student';
  const firstName = displayName.split(' ')[0];
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  useEffect(() => {
    const loadWeeklyProgress = async () => {
      try {
        setWeeklyLoading(true);
        setWeeklyError('');
        const response = await getMyProgress();
        setWeeklyAttempts(response?.data?.attempts || []);
      } catch (error) {
        setWeeklyError(error?.response?.data?.message || 'Unable to load weekly performance.');
      } finally {
        setWeeklyLoading(false);
      }
    };

    loadWeeklyProgress();
  }, []);

  const weeklyChartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        scoreTotal: 0,
        attemptCount: 0
      };
    });

    const dayMap = Object.fromEntries(days.map((day) => [day.key, day]));

    weeklyAttempts.forEach((attempt) => {
      const submittedAt = new Date(attempt?.submittedAt);
      if (Number.isNaN(submittedAt.getTime())) return;

      submittedAt.setHours(0, 0, 0, 0);
      const key = submittedAt.toISOString().slice(0, 10);
      if (!dayMap[key]) return;

      dayMap[key].scoreTotal += Number(attempt?.percentage || 0);
      dayMap[key].attemptCount += 1;
    });

    return days.map((day) => ({
      label: day.label,
      attempts: day.attemptCount,
      score: day.attemptCount ? Math.round(day.scoreTotal / day.attemptCount) : 0
    }));
  }, [weeklyAttempts]);

  const hasWeeklyData = weeklyChartData.some((point) => point.attempts > 0);

  const weeklyLinePoints = useMemo(() => {
    if (!weeklyChartData.length) return '';
    return weeklyChartData
      .map((point, index) => {
        const x = (index / Math.max(weeklyChartData.length - 1, 1)) * 100;
        const y = 100 - point.score;
        return `${x},${y}`;
      })
      .join(' ');
  }, [weeklyChartData]);

  const weeklyAreaPoints = useMemo(() => {
    if (!weeklyLinePoints) return '';
    return `0,100 ${weeklyLinePoints} 100,100`;
  }, [weeklyLinePoints]);

  const weeklyAverage = useMemo(() => {
    const completed = weeklyChartData.filter((point) => point.attempts > 0);
    if (!completed.length) return 0;

    return Math.round(
      completed.reduce((total, point) => total + point.score, 0) / completed.length
    );
  }, [weeklyChartData]);

  const enrolledCoursesAnimated = useCountUp(18, 950);
  const upcomingKuppiAnimated = useCountUp(upcomingClasses.length, 1050);
  const completedQuizzesAnimated = useCountUp(42, 1150);
  const overallProgressAnimated = useCountUp(78, 1250);
  const weeklyAverageAnimated = useCountUp(
    weeklyAverage,
    850,
    !weeklyLoading && !weeklyError && hasWeeklyData
  );

  const showChartTooltip = (point, xPercent, yPercent, event) => {
    const chartElement = chartWrapRef.current;
    if (!chartElement) return;

    const rect = chartElement.getBoundingClientRect();
    const fallbackLeft = (xPercent / 100) * rect.width;
    const fallbackTop = (yPercent / 100) * rect.height;

    const rawLeft = event?.clientX ? event.clientX - rect.left : fallbackLeft;
    const rawTop = event?.clientY ? event.clientY - rect.top : fallbackTop;

    const left = Math.max(70, Math.min(rawLeft, rect.width - 70));
    const top = Math.max(26, Math.min(rawTop - 14, rect.height - 10));

    setChartTooltip({
      left,
      top,
      label: point.label,
      score: point.score,
      attempts: point.attempts
    });
  };

  const sidebarItems = [
    { icon: '▦', label: 'Dashboard', route: '/student-dashboard', active: true },
    { icon: '🎓', label: 'My Courses', route: '/student/my-courses' },
    { icon: '📚', label: 'Course & Contents', route: '/student/courses' },
    { icon: '📝', label: 'Quiz & Mock Exams', route: '/student/quizzes' },
    { icon: '🎥', label: 'Kuppi Sessions', route: '/student/courses' },
    { icon: '💬', label: 'Community Board', route: '/student/community' },
    { icon: '📈', label: 'Progress Analytics', route: '/student/progress' },
    { icon: '👑', label: 'Premium', route: '/student/premium' },
    { icon: '🤖', label: 'AI Chatbot', action: () => setChatOpenSignal((prev) => prev + 1) },
    { icon: '⚙', label: 'Settings', route: '/settings' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSidebarAction = (item) => {
    if (item.action) {
      item.action();
      return;
    }
    navigate(item.route);
  };

  return (
    <div className="student-v2-shell">
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
              aria-current={item.active ? 'page' : undefined}
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
      </aside>

      <main className="student-v2-main">
        <header className="student-v2-topbar">
          <div className="student-v2-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              placeholder="Search courses, sessions, materials..."
              aria-label="Search courses, sessions, materials"
            />
          </div>

          <div className="student-v2-tools">
            <button
              type="button"
              className="ghost-icon"
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              onClick={toggleTheme}
            >
              {isDarkMode ? '☀️' : '◐'}
            </button>
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

        <section className="student-v2-welcome-row enter-rise" style={{ '--enter-delay': '20ms' }}>
          <div>
            <h2>Welcome back, {firstName} 👋</h2>
            <p>
              Your intellectual journey is 78% complete for this semester.
              Focus on your upcoming Kuppi session today.
            </p>
          </div>
          <div className="student-v2-date-card">
            <small>Today</small>
            <strong>{todayLabel}</strong>
          </div>
        </section>

        <section className="student-v2-metrics-grid">
          <article className="v2-metric-card enter-rise" style={{ '--enter-delay': '80ms' }}>
            <span className="metric-icon" aria-hidden="true">📘</span>
            <small>Enrolled Courses</small>
            <strong>{enrolledCoursesAnimated}</strong>
            <p>+2 since last month</p>
          </article>
          <article className="v2-metric-card enter-rise" style={{ '--enter-delay': '140ms' }}>
            <span className="metric-icon" aria-hidden="true">👥</span>
            <small>Upcoming Kuppi</small>
            <strong>{upcomingKuppiAnimated}</strong>
            <p>Next at 4:30 PM</p>
          </article>
          <article className="v2-metric-card enter-rise" style={{ '--enter-delay': '200ms' }}>
            <span className="metric-icon" aria-hidden="true">☑</span>
            <small>Completed Quizzes</small>
            <strong>{completedQuizzesAnimated}</strong>
            <p>Top 5% in faculty</p>
          </article>
          <article className="v2-metric-card progress-card enter-rise" style={{ '--enter-delay': '260ms' }}>
            <span className="metric-icon" aria-hidden="true">🧭</span>
            <small>Overall Progress</small>
            <strong>{overallProgressAnimated}%</strong>
            <div className="mini-progress-track">
              <div className="mini-progress-fill" style={{ width: `${overallProgressAnimated}%` }}></div>
            </div>
          </article>
        </section>

        <section className="student-v2-content-grid enter-rise" style={{ '--enter-delay': '320ms' }}>
          <section className="student-v2-analytics">
            <div className="student-v2-panel-title-row">
              <div>
                <h3>Weekly Performance</h3>
                <p>Quiz performance over the last 7 days</p>
              </div>
              <button type="button" className="panel-filter">This Week ▾</button>
            </div>
            <div className="student-v2-chart-placeholder">
              {weeklyLoading ? (
                <div className="chart-state">Loading weekly performance...</div>
              ) : weeklyError ? (
                <div className="chart-state error">{weeklyError}</div>
              ) : (
                <>
                  <div className="weekly-chart-wrap" ref={chartWrapRef}>
                    <svg viewBox="0 0 100 100" className="weekly-chart-svg" aria-label="Weekly performance chart">
                      <defs>
                        <linearGradient id="weeklyAreaGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#3f86f1" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#3f86f1" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>

                      <polyline className="weekly-grid-line" points="0,20 100,20" />
                      <polyline className="weekly-grid-line" points="0,40 100,40" />
                      <polyline className="weekly-grid-line" points="0,60 100,60" />
                      <polyline className="weekly-grid-line" points="0,80 100,80" />

                      {hasWeeklyData && (
                        <polygon points={weeklyAreaPoints} className="weekly-area" />
                      )}
                      <polyline points={weeklyLinePoints} className="weekly-line" />

                      {weeklyChartData.map((point, index) => {
                        const x = (index / Math.max(weeklyChartData.length - 1, 1)) * 100;
                        const y = 100 - point.score;
                        return (
                          <circle
                            key={`${point.label}-${index}`}
                            cx={x}
                            cy={y}
                            r="1.8"
                            tabIndex="0"
                            className={point.attempts ? 'weekly-point' : 'weekly-point muted'}
                            aria-label={`${point.label}: ${point.score}% average score across ${point.attempts} attempt${point.attempts === 1 ? '' : 's'}`}
                            onMouseEnter={(event) => showChartTooltip(point, x, y, event)}
                            onMouseMove={(event) => showChartTooltip(point, x, y, event)}
                            onMouseLeave={() => setChartTooltip(null)}
                            onFocus={() => showChartTooltip(point, x, y)}
                            onBlur={() => setChartTooltip(null)}
                          />
                        );
                      })}
                    </svg>

                    {chartTooltip && (
                      <div
                        className="weekly-tooltip"
                        style={{ left: `${chartTooltip.left}px`, top: `${chartTooltip.top}px` }}
                      >
                        <strong>{chartTooltip.label}</strong>
                        <span>{chartTooltip.score}% avg score</span>
                        <small>{chartTooltip.attempts} attempt{chartTooltip.attempts === 1 ? '' : 's'}</small>
                      </div>
                    )}
                  </div>

                  <div className="chart-axis">
                    {weeklyChartData.map((point) => (
                      <span key={point.label}>{point.label}</span>
                    ))}
                  </div>

                  <p className="weekly-summary">
                    {hasWeeklyData
                      ? `Weekly average score: ${weeklyAverageAnimated}%`
                      : 'No quiz attempts recorded in the last 7 days.'}
                  </p>
                </>
              )}
            </div>

            <div className="student-v2-panel-title-row materials-head">
              <h3>Recently Accessed Materials</h3>
            </div>
            <div className="student-v2-materials-grid">
              {recentMaterials.map((item) => (
                <article key={item.id} className="material-card">
                  <span className="material-icon" aria-hidden="true">▣</span>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.meta}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="student-v2-right-column">
            <section className="student-v2-kuppi-card">
              <div className="student-v2-panel-title-row">
                <h3>Kuppi Sessions</h3>
                <span className="live-soon">Live Soon</span>
              </div>

              <article className="student-v2-live-session">
                <small>{upcomingClasses[0].status}</small>
                <h4>{upcomingClasses[0].course}</h4>
                <p>by {upcomingClasses[0].instructor}</p>
                <div className="session-meta">
                  <span>{upcomingClasses[0].time}</span>
                  <span>{upcomingClasses[0].duration}</span>
                </div>
                <button type="button" onClick={() => navigate('/student/courses')}>Join Live Session</button>
              </article>

              <div className="student-v2-session-list">
                {upcomingClasses.slice(1).map((item) => (
                  <article key={item.id} className="session-mini-card">
                    <h4>{item.course}</h4>
                    <p>{item.time}</p>
                    <button type="button" onClick={() => navigate('/student/courses')}>Set Reminder</button>
                  </article>
                ))}
              </div>
            </section>

            <section className="student-v2-campus-card">
              <h3>Campus Buzz</h3>
              <div className="buzz-list">
                {campusBuzz.map((item) => (
                  <article key={item.id} className="buzz-item">
                    <small>{item.tag}</small>
                    <p>{item.text}</p>
                    <span>{item.age}</span>
                  </article>
                ))}
              </div>
            </section>

            <button type="button" className="student-v2-logout" onClick={handleLogout}>
              Sign Out
            </button>
          </aside>
        </section>

        <AIChatWidget
          studentId={user?._id || 'guest-student'}
          context={{
            page: 'student-dashboard',
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

export default StudentDashboard;
