import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { getQuizzes, deleteQuiz } from '../../services/quizService';
import './QuizList.css';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

const difficultyColor = { Easy: '#10b981', Medium: '#f59e0b', Hard: '#ef4444' };

// Mock user enrolled courses
const USER_ENROLLED_COURSES = ['Data Structures', 'Advanced Mathematics', 'Web Development', 'Database Systems'];

// Mock recommended quizzes based on user progress
const getRecommendedQuizzes = (allQuizzes) => {
  return allQuizzes
    .filter(q => q.difficulty === 'Medium')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);
};

const QuizList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('All');
  const [subject, setSubject] = useState('');
  const [recommendedQuizzes, setRecommendedQuizzes] = useState([]);

  const fetchQuizzes = useCallback(async (searchTerm = '') => {
    try {
      setLoading(true);
      const filters = {};
      if (difficulty !== 'All') filters.difficulty = difficulty;
      if (subject.trim()) filters.subject = subject.trim();
      if (searchTerm.trim()) filters.search = searchTerm.trim();
      const res = await getQuizzes(filters);
      const quizzesData = res.data || [];
      setQuizzes(quizzesData);
      
      // Get recommended quizzes only when loading all quizzes
      if (!searchTerm && difficulty === 'All' && !subject) {
        setRecommendedQuizzes(getRecommendedQuizzes(quizzesData));
      }
    } catch (err) {
      setError('Failed to load quizzes. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [difficulty, subject]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQuizzes(search);
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
        {/* Personalized Header */}
        <div className="page-title-row">
          <div className="personalized-header">
            <h1 className="page-title">📝 Your Quizzes Hub</h1>
            <p className="page-subtitle">
              Welcome back, {user?.name?.split(' ')[0]}! 👋 Continue learning and improve your scores
            </p>
            
            {/* User Learning Stats */}
            <div className="user-stats">
              <div className="stat-item">
                <span className="stat-icon">✅</span>
                <div className="stat-content">
                  <span className="stat-label">Quizzes Attempted</span>
                  <span className="stat-value">12</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🎯</span>
                <div className="stat-content">
                  <span className="stat-label">Average Score</span>
                  <span className="stat-value">87%</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🔥</span>
                <div className="stat-content">
                  <span className="stat-label">Current Streak</span>
                  <span className="stat-value">7 days</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="title-actions">
            <button className="btn-secondary" onClick={() => navigate('/progress')}>
              📈 My Progress
            </button>
            {user?.role === 'admin' && (
              <button className="btn-primary" onClick={() => navigate('/quizzes/create')}>
                ＋ Create Quiz
              </button>
            )}
          </div>
        </div>

        {/* Recommended For You Section */}
        {recommendedQuizzes.length > 0 && !search && difficulty === 'All' && !subject && (
          <div className="recommended-section">
            <div className="section-headers">
              <h2 className="section-title">🎯 Recommended For You</h2>
              <p className="section-subtitle">Perfect for your current level</p>
            </div>
            <div className="recommended-grid">
              {recommendedQuizzes.map(quiz => (
                <div key={quiz._id} className="quiz-card recommended-card">
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Course-Based Quizzes */}
        <div className="courses-section">
          <div className="section-headers">
            <h2 className="section-title">📚 Your Courses</h2>
            <p className="section-subtitle">Quizzes for your enrolled courses</p>
          </div>
          <div className="courses-list">
            {USER_ENROLLED_COURSES.map((course, index) => (
              <button
                key={index}
                className={`course-pill ${subject === course ? 'active' : ''}`}
                onClick={() => setSubject(course)}
              >
                {course}
              </button>
            ))}
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
            onBlur={() => fetchQuizzes(search)}
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

        {/* Content Section Label */}
        {(search || subject || difficulty !== 'All') && (
          <div className="content-section-header">
            <h2 className="content-title">Available Quizzes</h2>
            {subject && <span className="filter-tag">Filtered by: {subject}</span>}
            {search && <span className="filter-tag">Search: {search}</span>}
            {difficulty !== 'All' && <span className="filter-tag">Difficulty: {difficulty}</span>}
          </div>
        )}

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
            {user?.role === 'admin' && (
              <button className="btn-primary" onClick={() => navigate('/quizzes/create')}>
                ＋ Create Quiz
              </button>
            )}
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
