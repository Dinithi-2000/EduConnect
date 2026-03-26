import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { getMyProgress, getQuizzes } from '../../services/quizService';
import './StudentQuizzes.css';

const StudentQuizzes = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [progress, setProgress] = useState({ summary: { totalAttempts: 0, averageScore: 0, bestScore: 0 }, attempts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const [quizRes, progressRes] = await Promise.all([getQuizzes(), getMyProgress()]);
        setQuizzes(quizRes.data || []);
        setProgress(progressRes.data || { summary: { totalAttempts: 0, averageScore: 0, bestScore: 0 }, attempts: [] });
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load quizzes.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const latestAttemptByQuizId = useMemo(() => {
    const map = {};
    (progress.attempts || []).forEach((attempt) => {
      const quizId = typeof attempt.quiz === 'string' ? attempt.quiz : attempt.quiz?._id;
      if (!quizId) return;

      const current = map[quizId];
      const currentTime = current ? new Date(current.submittedAt).getTime() : 0;
      const nextTime = new Date(attempt.submittedAt).getTime();
      if (!current || nextTime > currentTime) {
        map[quizId] = attempt;
      }
    });
    return map;
  }, [progress.attempts]);

  return (
    <DashboardLayout activeSection="Quizzes" theme="light">
      <div className="student-quizzes-page">
        <div className="student-quizzes-header">
          <div>
            <h1>Student Quiz Center</h1>
            <p>Attempt quizzes and track your score improvements.</p>
          </div>
          <button className="progress-btn" onClick={() => navigate('/student/progress')}>
            Open Progress Dashboard
          </button>
        </div>

        <div className="quiz-stat-grid">
          <article className="stat-card">
            <span>Total Quizzes</span>
            <strong>{quizzes.length}</strong>
          </article>
          <article className="stat-card">
            <span>Submitted Attempts</span>
            <strong>{progress.summary?.totalAttempts || 0}</strong>
          </article>
          <article className="stat-card">
            <span>Average Score</span>
            <strong>{progress.summary?.averageScore || 0}%</strong>
          </article>
          <article className="stat-card">
            <span>Best Score</span>
            <strong>{progress.summary?.bestScore || 0}%</strong>
          </article>
        </div>

        {loading ? (
          <div className="state-box">Loading quizzes...</div>
        ) : error ? (
          <div className="state-box error">{error}</div>
        ) : quizzes.length === 0 ? (
          <div className="state-box">No quizzes available yet.</div>
        ) : (
          <div className="quiz-card-grid">
            {quizzes.map((quiz) => {
              const latestAttempt = latestAttemptByQuizId[quiz._id];
              return (
                <div key={quiz._id} className="quiz-card">
                  <div className="quiz-card-top">
                    <h3>{quiz.title}</h3>
                    <span className="difficulty-pill">{quiz.difficulty}</span>
                  </div>

                  <p className="quiz-subject">{quiz.subject}</p>
                  <p className="quiz-meta">
                    {quiz.questions?.length || 0} questions • {quiz.timeLimit || 0} mins
                  </p>

                  {latestAttempt ? (
                    <div className="latest-attempt">
                      <span>Latest Score: <strong>{latestAttempt.percentage}%</strong></span>
                      <small>{new Date(latestAttempt.submittedAt).toLocaleString()}</small>
                    </div>
                  ) : (
                    <div className="latest-attempt empty">Not attempted yet</div>
                  )}

                  <div className="quiz-actions">
                    <button onClick={() => navigate(`/quizzes/${quiz._id}/attempt`)}>
                      {latestAttempt ? 'Re-attempt Quiz' : 'Start Quiz'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentQuizzes;
