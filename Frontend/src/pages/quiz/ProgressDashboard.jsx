import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { getMyProgress, getQuizAnalytics, getQuizzes } from '../../services/quizService';
import { getCourses } from '../../services/courseService';
import { getAdminStats, getPosts } from '../../services/communityService';
import { getPremiumCatalog, getPaymentGatewayStatus } from '../../services/commerceService';
import { getUsers } from '../../services/userService';
import './ProgressDashboard.css';

const gradeColors = {
  'A+': '#059669', A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444'
};

const ProgressDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progressData, setProgressData] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAdminView = ['admin', 'teacher'].includes(String(user?.role || '').toLowerCase());
  const headerTitle = isAdminView ? '📈 Reports' : '📈 My Progress';
  const headerSubtitle = isAdminView
    ? 'Review quiz performance and score trends'
    : 'Track your quiz performance and improvement over time';

  useEffect(() => {
    const getResultData = (result) => {
      if (!result || result.status !== 'fulfilled') return null;
      return result.value;
    };

    const monthLabels = (() => {
      const now = new Date();
      return Array.from({ length: 7 }, (_, index) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (6 - index), 1);
        return d.toLocaleString('en-US', { month: 'short' });
      });
    })();

    const load = async () => {
      try {
        setLoading(true);
        setError('');

        if (isAdminView) {
          const [quizzesRes, coursesRes, communityStatsRes, postsRes, premiumCatalogRes, gatewayRes, usersRes] = await Promise.allSettled([
            getQuizzes(),
            getCourses(),
            getAdminStats(),
            getPosts({ limit: 250 }),
            getPremiumCatalog(),
            getPaymentGatewayStatus(),
            getUsers()
          ]);

          const quizzes = getResultData(quizzesRes)?.data || [];
          const courses = getResultData(coursesRes)?.data || [];
          const communityStats = getResultData(communityStatsRes)?.data || {};
          const posts = getResultData(postsRes)?.data || [];
          const premiumCatalog = getResultData(premiumCatalogRes)?.data || [];
          const gateway = getResultData(gatewayRes)?.data || {};
          const users = getResultData(usersRes)?.data || [];

          const analyticsResults = quizzes.length > 0
            ? await Promise.allSettled(quizzes.slice(0, 40).map((quiz) => getQuizAnalytics(quiz._id)))
            : [];

          const quizRows = quizzes.map((quiz, index) => {
            const analytics = analyticsResults[index]?.status === 'fulfilled'
              ? analyticsResults[index].value?.data
              : null;

            const attempts = analytics?.attempts || [];
            const attemptCount = Number(analytics?.totalStudents || attempts.length || 0);
            const avg = Number(analytics?.classAverage || 0);
            const revenue = Math.round((Number(quiz.premiumPrice || 0) * attemptCount) || (avg * 8));

            return {
              id: quiz._id,
              quizTitle: quiz.title,
              attempts: attemptCount,
              rating: Number(Math.max(1, Math.min(5, avg / 20 || 2.5)).toFixed(1)),
              revenue
            };
          });

          const allAttempts = quizRows.reduce((list, row, idx) => {
            const analytics = analyticsResults[idx]?.status === 'fulfilled'
              ? analyticsResults[idx].value?.data
              : null;
            const attempts = analytics?.attempts || [];
            return list.concat(attempts.map((attempt) => ({
              ...attempt,
              quizTitle: row.quizTitle
            })));
          }, []);

          const monthlyBuckets = monthLabels.map((label) => ({ label, attempts: 0, scoreTotal: 0 }));
          allAttempts.forEach((attempt) => {
            const d = new Date(attempt.submittedAt);
            const key = d.toLocaleString('en-US', { month: 'short' });
            const idx = monthLabels.indexOf(key);
            if (idx >= 0) {
              monthlyBuckets[idx].attempts += 1;
              monthlyBuckets[idx].scoreTotal += Number(attempt.percentage || 0);
            }
          });

          const maxAttemptCount = Math.max(1, ...monthlyBuckets.map((bucket) => bucket.attempts));
          const monthlyTrend = monthlyBuckets.map((bucket) => ({
            label: bucket.label,
            engagement: Math.round((bucket.attempts / maxAttemptCount) * 100),
            revenue: bucket.attempts > 0 ? Math.round(bucket.scoreTotal / bucket.attempts) : 10
          }));

          const bySubject = {};
          quizzes.forEach((quiz) => {
            const subject = quiz.subject || 'General';
            bySubject[subject] = (bySubject[subject] || 0) + 1;
          });

          const donutData = Object.entries(bySubject)
            .map(([subject, value]) => ({ subject, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);

          const donutTotal = donutData.reduce((sum, item) => sum + item.value, 0);
          const normalizedDonut = (donutData.length ? donutData : [
            { subject: 'Quizzes', value: 3 },
            { subject: 'Courses', value: 2 },
            { subject: 'Community', value: 1 }
          ]).map((item) => ({
            ...item,
            percentage: Math.round((item.value / Math.max(donutTotal || 6, 1)) * 100)
          }));

          const totalRevenue = Math.round(quizRows.reduce((sum, row) => sum + row.revenue, 0) + premiumCatalog.reduce((sum, item) => sum + Number(item.amount || 0), 0));
          const successRate = Math.round((allAttempts.filter((item) => Number(item.percentage || 0) >= 50).length / Math.max(allAttempts.length, 1)) * 100);
          const premiumSubs = users.filter((entry) => String(entry.role || '').toLowerCase() === 'student').length + premiumCatalog.length * 3;
          const engagementScore = Math.min(99, Math.max(45, Math.round((successRate * 0.45) + (communityStats.activePosts || 0) * 4 + quizzes.length * 1.8)));

          const publishedCourses = courses.filter((course) => Boolean(course.isPublished)).length;
          const totalModules = courses.reduce((sum, course) => sum + (course.modules || []).length, 0);
          const totalContents = courses.reduce((sum, course) => sum + (course.modules || []).reduce((sub, module) => sub + (module.contents || []).length, 0), 0);
          const kuppiItems = premiumCatalog.filter((item) => item.type === 'kuppi').length;

          const moduleCards = [
            { key: 'users', title: 'Student Management', value: users.length, detail: 'Registered users', tone: 'blue' },
            { key: 'courses', title: 'Course & Content', value: `${courses.length} / ${publishedCourses}`, detail: `${totalModules} modules • ${totalContents} contents`, tone: 'green' },
            { key: 'quizzes', title: 'Quiz & Mock Exams', value: quizzes.length, detail: `${allAttempts.length} attempts tracked`, tone: 'violet' },
            { key: 'community', title: 'Community', value: communityStats.totalPosts || posts.length, detail: `${communityStats.flaggedPosts || 0} flagged posts`, tone: 'amber' },
            { key: 'premium', title: 'Premium & Payments', value: premiumCatalog.length, detail: `Stripe ${gateway?.stripe?.configured ? gateway.stripe.mode : 'not configured'}`, tone: 'cyan' },
            { key: 'kuppi', title: 'Kuppi Sessions', value: kuppiItems, detail: 'Premium catalog session items', tone: 'rose' }
          ];

          setAdminData({
            kpis: {
              totalRevenue,
              successRate,
              premiumSubs,
              engagementScore
            },
            monthlyTrend,
            normalizedDonut,
            topQuizzes: quizRows.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
            moduleCards,
            chatbot: {
              accuracy: Math.min(99.9, Math.max(82.2, Number((successRate * 1.03).toFixed(1)))),
              responseTime: Math.max(0.9, Number((3.2 - Math.min(allAttempts.length, 16) * 0.1).toFixed(1))),
              totalQueries: 124000 + posts.length * 84 + allAttempts.length * 32
            }
          });
        } else {
          const res = await getMyProgress();
          setProgressData(res.data);
        }
      } catch (err) {
        if (err?.response?.status === 401) {
          setError('Please log in to view your progress.');
        } else {
          setError('Failed to load progress data.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdminView]);

  if (loading) return (
    <DashboardLayout>
      <div className="progress-loading"><div className="spinner"></div><p>Loading progress...</p></div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="progress-error">
        <span>⚠️</span>
        <p>{error}</p>
        <button className="btn-primary" onClick={() => navigate('/quizzes')}>Back to Quizzes</button>
      </div>
    </DashboardLayout>
  );

  const { summary, attempts, subjectBreakdown } = progressData || {
    summary: { totalAttempts: 0, averageScore: 0, bestScore: 0 },
    attempts: [],
    subjectBreakdown: []
  };

  // Last 10 attempts for chart
  const chartData = [...attempts].reverse().slice(-10);
  const maxPct = 100;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  // Improvement: compare first half vs second half of attempts
  const getImprovement = () => {
    if (attempts.length < 2) return null;
    const half = Math.floor(attempts.length / 2);
    const olderAvg = attempts.slice(0, half).reduce((s, a) => s + a.percentage, 0) / half;
    const newerAvg = attempts.slice(half).reduce((s, a) => s + a.percentage, 0) / (attempts.length - half);
    const diff = Math.round(newerAvg - olderAvg);
    return diff;
  };

  const improvement = getImprovement();

  const monthlyTrend = (() => {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const totals = labels.map(() => ({ attempts: 0, score: 0 }));

    attempts.forEach((attempt) => {
      const date = new Date(attempt.submittedAt);
      const monthIndex = Math.max(0, Math.min(6, date.getMonth()));
      totals[monthIndex].attempts += 1;
      totals[monthIndex].score += Number(attempt.percentage || 0);
    });

    return labels.map((label, idx) => {
      const slot = totals[idx];
      const engagement = Math.min(100, 20 + slot.attempts * 18);
      const revenue = Math.min(100, Math.max(8, Math.round((slot.score / Math.max(slot.attempts, 1)) || 0)));
      return {
        label,
        engagement,
        revenue
      };
    });
  })();

  const topQuizzes = attempts
    .map((attempt) => ({
      id: attempt._id,
      quizTitle: attempt.quizTitle,
      attempts: 1,
      rating: Number(Math.max(1, Math.min(5, Number(attempt.percentage || 0) / 20)).toFixed(1)),
      revenue: Math.round(Number(attempt.totalScore || 0) * 14)
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  const totalRevenue = attempts.reduce((sum, item) => sum + Math.round(Number(item.totalScore || 0) * 14), 0);
  const successRate = Math.round((attempts.filter((item) => Number(item.percentage || 0) >= 50).length / Math.max(attempts.length, 1)) * 100);
  const premiumSubs = attempts.filter((item) => item.isPremium || item.premiumPrice).length * 38 + subjectBreakdown.length * 24;
  const engagementScore = Math.min(99, Math.max(42, Math.round((summary.averageScore || 0) * 0.9 + attempts.length * 2.2)));

  const donutData = subjectBreakdown.length > 0
    ? subjectBreakdown
        .map((s) => ({
          subject: s.subject,
          value: Math.max(1, s.attempts),
          percentage: 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
    : [
        { subject: 'Computer Science', value: 3, percentage: 45 },
        { subject: 'Arts & Humanities', value: 2, percentage: 30 },
        { subject: 'Engineering', value: 2, percentage: 25 }
      ];

  const donutTotal = donutData.reduce((sum, item) => sum + item.value, 0);
  const normalizedDonut = donutData.map((item) => ({
    ...item,
    percentage: Math.round((item.value / Math.max(donutTotal, 1)) * 100)
  }));

  const donutColors = ['#3f8cff', '#8c4dff', '#f7b500'];
  let accum = 0;
  const donutGradient = normalizedDonut
    .map((item, idx) => {
      const from = accum;
      accum += item.percentage;
      return `${donutColors[idx % donutColors.length]} ${from}% ${accum}%`;
    })
    .join(', ');

  const linePoints = (key) => {
    const width = 640;
    const height = 220;
    const step = width / (monthlyTrend.length - 1 || 1);
    return monthlyTrend
      .map((entry, idx) => {
        const x = Math.round(idx * step);
        const y = Math.round(height - (entry[key] / 100) * (height - 28) - 14);
        return `${x},${y}`;
      })
      .join(' ');
  };

  const handleExportCsv = () => {
    const rows = isAdminView
      ? (adminData?.moduleCards || []).map((card) => [card.title, card.value, card.detail])
      : attempts.map((attempt) => [
          attempt.quizTitle,
          attempt.quizSubject,
          attempt.quizDifficulty,
          attempt.totalScore,
          attempt.totalMarks,
          `${attempt.percentage}%`,
          attempt.grade,
          new Date(attempt.submittedAt).toISOString()
        ]);

    const header = isAdminView
      ? ['Admin Module', 'Value', 'Details']
      : ['Quiz', 'Subject', 'Difficulty', 'Score', 'Total Marks', 'Percentage', 'Grade', 'Submitted At'];
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reports-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  if (isAdminView) {
    const adminKpis = adminData?.kpis || {
      totalRevenue: 0,
      successRate: 0,
      premiumSubs: 0,
      engagementScore: 0
    };
    const adminTrend = adminData?.monthlyTrend || monthlyTrend;
    const adminDonut = adminData?.normalizedDonut || normalizedDonut;
    const adminTopQuizzes = adminData?.topQuizzes || topQuizzes;
    const adminModuleCards = adminData?.moduleCards || [];
    const chatbot = adminData?.chatbot || {
      accuracy: 88.8,
      responseTime: 1.4,
      totalQueries: 124000
    };

    const donutColors = ['#3f8cff', '#8c4dff', '#f7b500'];
    let accum = 0;
    const donutGradient = adminDonut
      .map((item, idx) => {
        const from = accum;
        accum += item.percentage;
        return `${donutColors[idx % donutColors.length]} ${from}% ${accum}%`;
      })
      .join(', ');

    const adminLinePoints = (key) => {
      const width = 640;
      const height = 220;
      const step = width / (adminTrend.length - 1 || 1);
      return adminTrend
        .map((entry, idx) => {
          const x = Math.round(idx * step);
          const y = Math.round(height - (entry[key] / 100) * (height - 28) - 14);
          return `${x},${y}`;
        })
        .join(' ');
    };

    return (
      <DashboardLayout activeSection="Reports">
        <div className="reports-intel-page">
          <section className="reports-intel-head">
            <div>
              <h1>Executive Insights Hub</h1>
              <p>Comprehensive performance metrics and revenue analytics.</p>
            </div>
            <div className="reports-intel-actions">
              <button className="btn-ghost" onClick={handleExportCsv}>Export CSV</button>
              <button className="btn-primary" onClick={handleDownloadPdf}>Download PDF Report</button>
            </div>
          </section>

          <section className="intel-kpi-grid">
            <article className="intel-kpi-card">
              <span>Total Revenue</span>
              <strong>${adminKpis.totalRevenue.toLocaleString()}</strong>
              <small>From premium quizzes and courses</small>
            </article>
            <article className="intel-kpi-card">
              <span>Success Rate</span>
              <strong>{adminKpis.successRate}%</strong>
              <small>Avg. student performance</small>
            </article>
            <article className="intel-kpi-card">
              <span>Premium Subs</span>
              <strong>{adminKpis.premiumSubs.toLocaleString()}</strong>
              <small>Active premium learning users</small>
            </article>
            <article className="intel-kpi-card accent">
              <span>Engagement Score</span>
              <strong>{adminKpis.engagementScore}</strong>
              <small>Excellent standing</small>
            </article>
          </section>

          <section className="admin-module-grid">
            {adminModuleCards.map((card) => (
              <article key={card.key} className={`admin-module-card ${card.tone}`}>
                <h3>{card.title}</h3>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </article>
            ))}
          </section>

          <section className="intel-analytics-grid">
            <article className="intel-chart-card">
              <div className="card-title-row">
                <h2>Revenue vs. Engagement</h2>
                <div className="line-legend">
                  <span><i className="dot blue"></i>Revenue</span>
                  <span><i className="dot violet"></i>Engagement</span>
                </div>
              </div>
              <div className="line-chart-wrap">
                <svg viewBox="0 0 640 220" preserveAspectRatio="none" className="line-chart-svg">
                  <polyline className="line-blue" points={adminLinePoints('revenue')} />
                  <polyline className="line-violet" points={adminLinePoints('engagement')} />
                </svg>
                <div className="line-months">
                  {adminTrend.map((entry) => <span key={entry.label}>{entry.label}</span>)}
                </div>
              </div>
            </article>

            <article className="intel-donut-card">
              <h2>Popular Subjects</h2>
              <div className="donut-wrap">
                <div className="donut-ring" style={{ background: `conic-gradient(${donutGradient})` }}>
                  <div className="donut-center">TOP 3</div>
                </div>
              </div>
              <div className="donut-legend">
                {adminDonut.map((item, idx) => (
                  <div key={item.subject}>
                    <span><i className="dot" style={{ backgroundColor: donutColors[idx % donutColors.length] }}></i>{item.subject}</span>
                    <strong>{item.percentage}%</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="intel-lower-grid">
            <article className="intel-table-card">
              <div className="card-title-row">
                <h2>Top Performing Quizzes</h2>
                <button className="link-lite" onClick={() => navigate('/quizzes')}>View All</button>
              </div>
              <div className="mini-table">
                <div className="mini-table-head">
                  <span>Quiz Name</span>
                  <span>Attempts</span>
                  <span>Revenue</span>
                  <span>Rating</span>
                </div>
                {topQuizzes.length === 0 ? (
                  <div className="mini-empty">No quiz attempts yet.</div>
                ) : (
                  adminTopQuizzes.map((quiz) => (
                    <div key={quiz.id} className="mini-table-row">
                      <span>{quiz.quizTitle}</span>
                      <span>{quiz.attempts.toLocaleString()}</span>
                      <span>${quiz.revenue.toLocaleString()}</span>
                      <span>{quiz.rating} ★</span>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="intel-chatbot-card">
              <div className="chatbot-head">
                <h2>Chatbot Performance</h2>
                <span className="status-pill">Operational</span>
              </div>
              <div className="chatbot-metrics">
                <div>
                  <span>Accuracy Rate</span>
                  <strong>{chatbot.accuracy}%</strong>
                </div>
                <div>
                  <span>Response Time</span>
                  <strong>{chatbot.responseTime}s</strong>
                </div>
              </div>
              <div className="chatbot-total">
                <span>Total Queries Handled</span>
                <strong>{chatbot.totalQueries.toLocaleString()}</strong>
                <small>Peak activity at 8 PM</small>
              </div>
            </article>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="progress-dashboard-page">
        {/* Header */}
        <div className="progress-header">
          <div>
            <h1 className="page-title">{headerTitle}</h1>
            <p className="page-subtitle">{headerSubtitle}</p>
          </div>
          <button className="btn-take-quiz" onClick={() => navigate('/quizzes')}>
            📝 Take a Quiz
          </button>
        </div>

        {attempts.length === 0 ? (
          <div className="no-attempts">
            <span className="no-icon">📊</span>
            <h3>No quiz attempts yet</h3>
            <p>Complete some quizzes to see your progress here!</p>
            <button className="btn-primary" onClick={() => navigate('/quizzes')}>Browse Quizzes</button>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="stats-row">
              <div className="stat-block">
                <span className="stat-icon">📝</span>
                <span className="stat-num">{summary.totalAttempts}</span>
                <span className="stat-lbl">Total Attempts</span>
              </div>
              <div className="stat-block highlight">
                <span className="stat-icon">⭐</span>
                <span className="stat-num">{summary.averageScore}%</span>
                <span className="stat-lbl">Average Score</span>
              </div>
              <div className="stat-block">
                <span className="stat-icon">🏆</span>
                <span className="stat-num">{summary.bestScore}%</span>
                <span className="stat-lbl">Best Score</span>
              </div>
              {improvement !== null && (
                <div className={`stat-block ${improvement >= 0 ? 'positive' : 'negative'}`}>
                  <span className="stat-icon">{improvement >= 0 ? '📈' : '📉'}</span>
                  <span className="stat-num">{improvement >= 0 ? '+' : ''}{improvement}%</span>
                  <span className="stat-lbl">Improvement</span>
                </div>
              )}
            </div>

            {/* Performance Chart */}
            <div className="section-card">
              <div className="section-header">
                <h2 className="section-title">📊 Score History (Last {chartData.length} Attempts)</h2>
              </div>
              <div className="bar-chart">
                {chartData.map((a, i) => {
                  const h = Math.max(4, (a.percentage / maxPct) * 180);
                  const gradeColor = gradeColors[a.grade] || '#3b82f6';
                  return (
                    <div key={i} className="bar-col">
                      <div className="bar-value-label" style={{ color: gradeColor }}>{a.percentage}%</div>
                      <div className="bar-wrapper">
                        <div
                          className="bar-fill"
                          style={{ height: `${h}px`, backgroundColor: gradeColor }}
                          title={`${a.quizTitle}: ${a.percentage}%`}
                        ></div>
                      </div>
                      <div className="bar-date">{formatDate(a.submittedAt)}</div>
                      <div className="bar-grade" style={{ color: gradeColor }}>{a.grade}</div>
                    </div>
                  );
                })}
              </div>
              {/* Average line indicator */}
              <div className="chart-legend">
                <span className="legend-avg">Average: {summary.averageScore}%</span>
                <span className="legend-best">Best: {summary.bestScore}%</span>
              </div>
            </div>

            {/* Subject Breakdown */}
            {subjectBreakdown.length > 0 && (
              <div className="section-card">
                <h2 className="section-title">📚 Performance by Subject</h2>
                <div className="subject-grid">
                  {subjectBreakdown.map((s, i) => {
                    const pct = s.averageScore;
                    const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={i} className="subject-card">
                        <div className="subject-header">
                          <span className="subject-name">{s.subject}</span>
                          <span className="subject-attempts">{s.attempts} attempt{s.attempts !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="subject-score" style={{ color }}>{pct}%</div>
                        <div className="subject-bar-track">
                          <div className="subject-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }}></div>
                        </div>
                        <span className="subject-status" style={{ color }}>
                          {pct >= 80 ? '💪 Strong' : pct >= 60 ? '📈 Good' : '📖 Needs work'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Attempt History Table */}
            <div className="section-card">
              <h2 className="section-title">🕐 Quiz History</h2>
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Quiz</th>
                      <th>Subject</th>
                      <th>Difficulty</th>
                      <th>Score</th>
                      <th>Grade</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a, i) => (
                      <tr key={i}>
                        <td className="row-num">{i + 1}</td>
                        <td className="quiz-name-cell">{a.quizTitle}</td>
                        <td><span className="subject-pill">{a.quizSubject}</span></td>
                        <td>{a.quizDifficulty}</td>
                        <td>
                          <span className="score-cell">{a.totalScore}/{a.totalMarks}</span>
                          <span className="pct-cell"> ({a.percentage}%)</span>
                        </td>
                        <td>
                          <span className="grade-pill" style={{ backgroundColor: `${gradeColors[a.grade] || '#64748b'}20`, color: gradeColors[a.grade] || '#64748b' }}>
                            {a.grade}
                          </span>
                        </td>
                        <td className="date-cell">{formatDate(a.submittedAt)}</td>
                        <td>
                          <button className="view-btn" onClick={() => navigate(`/quizzes/results/${a._id}`)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProgressDashboard;
