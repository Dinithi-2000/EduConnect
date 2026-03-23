import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { getQuizzes, deleteQuiz } from '../../services/quizService';
import './QuizList.css';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

const difficultyColor = { Easy: '#10b981', Medium: '#f59e0b', Hard: '#ef4444' };

const QuizList = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('All');
  const [subject, setSubject] = useState('');

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (difficulty !== 'All') filters.difficulty = difficulty;
      if (subject.trim()) filters.subject = subject.trim();
      if (search.trim()) filters.search = search.trim();
      const res = await getQuizzes(filters);
      setQuizzes(res.data || []);
    } catch (err) {
      setError('Failed to load quizzes. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuizzes(); }, [difficulty, subject]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQuizzes();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await deleteQuiz(id);
      setQuizzes(prev => prev.filter(q => q._id !== id));
    } catch {
      alert('Failed to delete quiz.');
    }
  };

  return (
    <DashboardLayout>
      <div className="quiz-list-page">
        {/* Page Title */}
        <div className="page-title-row">
          <div>
            <h1 className="page-title">📝 Quizzes</h1>
            <p className="page-subtitle">Browse and attempt available quizzes & mock exams</p>
          </div>
          <div className="title-actions">
            <button className="btn-secondary" onClick={() => navigate('/progress')}>
              📈 My Progress
            </button>
            <button className="btn-primary" onClick={() => navigate('/quizzes/create')}>
              ＋ Create Quiz
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search quizzes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="filter-input search-input-field"
            />
            <button type="submit" className="btn-primary search-btn">Search</button>
          </form>

          <input
            type="text"
            placeholder="Filter by subject..."
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="filter-input"
            onBlur={fetchQuizzes}
          />

          <div className="difficulty-tabs">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                className={`diff-tab ${difficulty === d ? 'active' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading quizzes...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <span>⚠️</span>
            <p>{error}</p>
            <button className="btn-primary" onClick={fetchQuizzes}>Retry</button>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <h3>No quizzes found</h3>
            <p>Create the first quiz to get started!</p>
            <button className="btn-primary" onClick={() => navigate('/quizzes/create')}>
              ＋ Create Quiz
            </button>
          </div>
        ) : (
          <div className="quiz-grid">
            {quizzes.map(quiz => (
              <div key={quiz._id} className="quiz-card">
                <div className="quiz-card-header">
                  <span
                    className="difficulty-badge"
                    style={{ backgroundColor: difficultyColor[quiz.difficulty] || '#64748b' }}
                  >
                    {quiz.difficulty}
                  </span>
                  <span className="subject-tag">{quiz.subject}</span>
                </div>

                <div className="quiz-card-body">
                  <h3 className="quiz-title">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="quiz-description">{quiz.description}</p>
                  )}
                  <div className="quiz-meta">
                    <span className="meta-item">❓ {quiz.questions?.length || 0} Questions</span>
                    <span className="meta-item">⏱ {quiz.timeLimit} min</span>
                    <span className="meta-item">⭐ {quiz.totalMarks} marks</span>
                  </div>
                </div>

                <div className="quiz-card-footer">
                  <button
                    className="btn-attempt"
                    onClick={() => navigate(`/quizzes/${quiz._id}/attempt`)}
                  >
                    ▶ Attempt Quiz
                  </button>
                  <div className="quiz-actions">
                    <button
                      className="btn-icon edit-btn"
                      title="Edit"
                      onClick={() => navigate(`/quizzes/${quiz._id}/edit`)}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon delete-btn"
                      title="Delete"
                      onClick={() => handleDelete(quiz._id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default QuizList;
