import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { getMyProgress } from '../../services/quizService';
import './ProgressDashboard.css';

const gradeColors = {
  'A+': '#059669', A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444'
};

const ProgressDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAdminView = ['admin', 'teacher'].includes(user?.role);
  const headerTitle = isAdminView ? '📈 Reports' : '📈 My Progress';
  const headerSubtitle = isAdminView
    ? 'Review quiz performance and score trends'
    : 'Track your quiz performance and improvement over time';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getMyProgress();
        setData(res.data);
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Please log in to view your progress.');
        } else {
          setError('Failed to load progress data.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  const { summary, attempts, subjectBreakdown } = data;

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
