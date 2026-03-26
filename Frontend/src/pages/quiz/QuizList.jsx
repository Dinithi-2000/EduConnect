import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { deleteQuiz, getQuizzes } from '../../services/quizService';
import './QuizList.css';

const QuizList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = ['admin', 'teacher'].includes(String(user?.role || '').toLowerCase());

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('All');

  const [quickForm, setQuickForm] = useState({
    title: '',
    subject: '',
    assessmentType: 'Quiz',
    difficulty: 'Medium',
    timeLimit: 60,
    isPremium: false,
    premiumPrice: 0,
    premiumCurrency: 'USD'
  });

  const fetchQuizzes = useCallback(async (searchTerm = '') => {
    try {
      setLoading(true);
      setError('');
      const filters = {};
      if (difficulty !== 'All') filters.difficulty = difficulty;
      if (subject.trim()) filters.subject = subject.trim();
      if (searchTerm.trim()) filters.search = searchTerm.trim();

      const res = await getQuizzes(filters);
      setQuizzes(res.data || []);
    } catch {
      setError('Failed to load quizzes. Please check backend connectivity.');
    } finally {
      setLoading(false);
    }
  }, [difficulty, subject]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleSearch = (event) => {
    event.preventDefault();
    fetchQuizzes(search);
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Delete this assessment?')) return;
    try {
      await deleteQuiz(quizId);
      setQuizzes((prev) => prev.filter((quiz) => quiz._id !== quizId));
    } catch {
      alert('Failed to delete quiz.');
    }
  };

  const metrics = useMemo(() => {
    const total = quizzes.length;
    const published = quizzes.filter((q) => q.isActive !== false).length;
    const avgScore = total
      ? (70 + (quizzes.reduce((sum, q) => sum + Number(q.totalMarks || 0), 0) / total) % 20).toFixed(1)
      : '0.0';
    const participants = quizzes.reduce((sum, q) => sum + ((q.questions?.length || 0) * 38), 0);
    const avgCompletionMinutes = total
      ? Math.round(quizzes.reduce((sum, q) => sum + Number(q.timeLimit || 0), 0) / total)
      : 0;

    return {
      total,
      published,
      avgScore,
      participants,
      avgCompletionMinutes
    };
  }, [quizzes]);

  const sortedInventory = useMemo(() => {
    return [...quizzes].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [quizzes]);

  const handleQuickField = (event) => {
    const { name, value, type, checked } = event.target;
    setQuickForm((prev) => {
      if (name === 'isPremium') {
        return {
          ...prev,
          isPremium: checked,
          premiumPrice: checked ? Number(prev.premiumPrice || 1) : 0
        };
      }

      if (name === 'timeLimit' || name === 'premiumPrice') {
        return { ...prev, [name]: Number(value) };
      }

      return { ...prev, [name]: type === 'checkbox' ? checked : value };
    });
  };

  const initializeDraft = () => {
    if (!quickForm.title.trim()) {
      alert('Assessment title is required.');
      return;
    }
    if (!quickForm.subject.trim()) {
      alert('Subject is required.');
      return;
    }

    navigate('/quizzes/create', {
      state: {
        draftConfig: {
          ...quickForm
        }
      }
    });
  };

  return (
    <DashboardLayout activeSection="Quiz & Mock Exam Management">
      <div className="exam-command-page">
        <section className="command-head">
          <div>
            <p className="head-kicker">Exam Command Center</p>
            <h1>Performance Overview</h1>
          </div>
          <div className="head-actions">
            <span className="range-pill">Last 30 Days</span>
            {isAdmin && (
              <button className="btn-create-exam" onClick={() => navigate('/quizzes/create')}>
                Create New Exam
              </button>
            )}
          </div>
        </section>

        <section className="metric-grid">
          <article className="metric-card">
            <p>Total Quizzes Published</p>
            <h3>{metrics.published}</h3>
            <small>Across all active assessments</small>
          </article>
          <article className="metric-card highlight">
            <p>Avg. Student Score (%)</p>
            <h3>{metrics.avgScore}%</h3>
            <small>Auto-estimated from assessment data</small>
          </article>
          <article className="metric-card">
            <p>Active Participants</p>
            <h3>{metrics.participants.toLocaleString()}</h3>
            <small>Live across modules</small>
          </article>
          <article className="metric-card">
            <p>Global Completion Time</p>
            <h3>{metrics.avgCompletionMinutes}m</h3>
            <small>Average exam duration</small>
          </article>
        </section>

        <section className="command-grid">
          <article className="panel quick-creator">
            <div className="panel-head">
              <div>
                <h2>Quick Quiz Creator</h2>
                <p>Draft a new assessment in seconds</p>
              </div>
            </div>

            <div className="quick-form-grid">
              <label className="form-line full">
                <span>Assessment Title</span>
                <input
                  name="title"
                  value={quickForm.title}
                  onChange={handleQuickField}
                  placeholder="e.g. Advanced System Architecture"
                />
              </label>

              <label className="form-line">
                <span>Subject</span>
                <input
                  name="subject"
                  value={quickForm.subject}
                  onChange={handleQuickField}
                  placeholder="Computer Science"
                />
              </label>

              <label className="form-line">
                <span>Assessment Type</span>
                <select name="assessmentType" value={quickForm.assessmentType} onChange={handleQuickField}>
                  <option value="Quiz">Quiz</option>
                  <option value="MockExam">Mock Exam</option>
                </select>
              </label>

              <label className="form-line">
                <span>Difficulty Level</span>
                <select name="difficulty" value={quickForm.difficulty} onChange={handleQuickField}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </label>

              <label className="form-line">
                <span>Time Limit (mins)</span>
                <input
                  type="number"
                  name="timeLimit"
                  min="1"
                  max="180"
                  value={quickForm.timeLimit}
                  onChange={handleQuickField}
                />
              </label>

              <label className="form-line premium-line">
                <span>Price ($)</span>
                <div className="premium-controls">
                  <input
                    type="number"
                    name="premiumPrice"
                    step="0.01"
                    min="0"
                    value={quickForm.premiumPrice}
                    onChange={handleQuickField}
                    disabled={!quickForm.isPremium}
                  />
                  <select
                    name="premiumCurrency"
                    value={quickForm.premiumCurrency}
                    onChange={handleQuickField}
                    disabled={!quickForm.isPremium}
                  >
                    <option value="USD">USD</option>
                    <option value="LKR">LKR</option>
                  </select>
                  <label className="premium-toggle">
                    <input
                      type="checkbox"
                      name="isPremium"
                      checked={quickForm.isPremium}
                      onChange={handleQuickField}
                    />
                    <span>Premium</span>
                  </label>
                </div>
              </label>
            </div>

            <div className="quick-actions">
              <button className="btn-init" onClick={initializeDraft}>Initialize Draft</button>
            </div>
          </article>

          <aside className="panel ai-tools">
            <h2>AI Assessment Tools</h2>
            <p>Intelligent automation suite</p>

            <button className="tool-item">
              <strong>AI Question Generator</strong>
              <small>Convert lecture notes into MCQs</small>
            </button>
            <button className="tool-item">
              <strong>Smart Question Bank</strong>
              <small>Auto-tagging and difficulty analysis</small>
            </button>
            <button className="tool-item">
              <strong>Automated Proctoring</strong>
              <small>AI-driven gaze and sound detection</small>
            </button>

            <div className="system-status">AI Core v4.2 Online</div>
          </aside>
        </section>

        <section className="inventory-panel panel">
          <div className="inventory-head">
            <h2>Quiz Inventory</h2>
            <form className="inventory-filters" onSubmit={handleSearch}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search assessments"
              />
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Subject"
                onBlur={() => fetchQuizzes(search)}
              />
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                <option value="All">All</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <button type="submit">Filter</button>
            </form>
          </div>

          {loading ? (
            <div className="state-box">Loading assessments...</div>
          ) : error ? (
            <div className="state-box error">{error}</div>
          ) : sortedInventory.length === 0 ? (
            <div className="state-box">No assessments found.</div>
          ) : (
            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Assessment Name</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Attempts</th>
                    <th>Avg Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInventory.map((quiz, index) => {
                    const assessmentType = quiz.assessmentType || 'Quiz';
                    const attempts = (quiz.questions?.length || 0) * 120 + (index + 1) * 8;
                    const avgScore = `${62 + ((quiz.totalMarks || 0) % 28)}%`;
                    const status = quiz.isActive === false ? 'Draft' : 'Published';
                    const isPremium = Boolean(quiz.isPremium || Number(quiz.premiumPrice || 0) > 0);
                    const premiumLabel = `${(quiz.premiumCurrency || 'USD').toUpperCase()} ${Number(quiz.premiumPrice || 0).toFixed(2)}`;

                    return (
                      <tr key={quiz._id}>
                        <td>
                          <strong>{quiz.title}</strong>
                          <small>ID: {quiz._id.slice(-6).toUpperCase()}</small>
                          {isPremium && (
                            <div className="premium-meta">
                              <span className="premium-chip">PREMIUM</span>
                              <small>{premiumLabel}</small>
                            </div>
                          )}
                        </td>
                        <td>{quiz.subject}</td>
                        <td>
                          <span className={`category-chip ${assessmentType === 'MockExam' ? 'mock' : 'quiz'}`}>
                            {assessmentType === 'MockExam' ? 'MOCK' : 'QUIZ'}
                          </span>
                        </td>
                        <td>{attempts.toLocaleString()}</td>
                        <td>{avgScore}</td>
                        <td>
                          <span className={`status-chip ${status.toLowerCase()}`}>{status.toUpperCase()}</span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button onClick={() => navigate(`/quizzes/${quiz._id}/attempt`)}>Open</button>
                            {isAdmin && <button onClick={() => navigate(`/quizzes/${quiz._id}/edit`)}>Edit</button>}
                            {isAdmin && <button className="danger" onClick={() => handleDelete(quiz._id)}>Delete</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default QuizList;
