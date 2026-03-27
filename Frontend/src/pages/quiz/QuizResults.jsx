import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAttemptById } from '../../services/quizService';
import './QuizResults.css';

const gradeColors = {
  'A+': '#059669', A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444'
};

const QuizResults = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReview, setShowReview] = useState(false);

  const role = String(user?.role || '').toLowerCase();
  const isStudentView = role === 'student';
  const quizHomePath = isStudentView ? '/student/quizzes' : '/quizzes';
  const progressPath = isStudentView ? '/student/progress' : '/progress';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAttemptById(attemptId);
        setAttempt(res.data);
      } catch { setError('Failed to load results.'); }
      finally { setLoading(false); }
    };
    load();
  }, [attemptId]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const renderResultsShell = (content) => (
    <div className="results-shell">
      <header className="results-shell-head">
        <button className="results-shell-back" onClick={() => navigate(quizHomePath)}>
          ← Back to Quiz Center
        </button>
        <div className="results-shell-title-wrap">
          <strong>Quiz Result</strong>
          <small>{attempt?.quizSubject || 'Quiz & Mock Exams'}</small>
        </div>
      </header>
      {content}
    </div>
  );

  if (loading) return (
    renderResultsShell(
      <div className="results-loading"><div className="spinner"></div><p>Loading results...</p></div>
    )
  );

  if (error) return (
    renderResultsShell(
      <div className="results-error"><span>⚠️</span><p>{error}</p></div>
    )
  );

  const gradeColor = gradeColors[attempt.grade] || '#64748b';
  const correctCount = attempt.answers.filter(a => a.isCorrect).length;
  const wrongCount = attempt.answers.length - correctCount;

  return renderResultsShell(
      <div className="quiz-results-page">
        {/* Score hero */}
        <div className="score-hero">
          <div className="score-card">
            <div className="grade-circle" style={{ borderColor: gradeColor, color: gradeColor }}>
              <span className="grade-letter">{attempt.grade}</span>
              <span className="grade-pct">{attempt.percentage}%</span>
            </div>
            <div className="score-info">
              <h1 className="result-quiz-title">{attempt.quizTitle}</h1>
              <p className="result-subject">{attempt.quizSubject} · {attempt.quizDifficulty}</p>
              <div className="score-numbers">
                <span className="score-big">{attempt.totalScore}</span>
                <span className="score-divider">/</span>
                <span className="score-total">{attempt.totalMarks} marks</span>
              </div>

              <div className="result-meta-row">
                <div className="rmeta-item">
                  <span className="rmeta-icon">✅</span>
                  <span className="rmeta-label">Correct</span>
                  <span className="rmeta-value correct">{correctCount}</span>
                </div>
                <div className="rmeta-item">
                  <span className="rmeta-icon">❌</span>
                  <span className="rmeta-label">Wrong</span>
                  <span className="rmeta-value wrong">{wrongCount}</span>
                </div>
                <div className="rmeta-item">
                  <span className="rmeta-icon">⏱</span>
                  <span className="rmeta-label">Time</span>
                  <span className="rmeta-value">{formatTime(attempt.timeTaken)}</span>
                </div>
                <div className="rmeta-item">
                  <span className="rmeta-icon">📊</span>
                  <span className="rmeta-label">Status</span>
                  <span className={`rmeta-value status-${attempt.status}`}>{attempt.status}</span>
                </div>
              </div>

              {/* Performance message */}
              <div className="performance-msg" style={{ backgroundColor: `${gradeColor}18`, borderColor: `${gradeColor}44` }}>
                {attempt.percentage >= 90 && '🏆 Outstanding! Excellent performance!'}
                {attempt.percentage >= 80 && attempt.percentage < 90 && '🎉 Great job! Keep it up!'}
                {attempt.percentage >= 70 && attempt.percentage < 80 && '👍 Good work! A little more effort and you\'ll ace it!'}
                {attempt.percentage >= 60 && attempt.percentage < 70 && '📚 Pass! Review your weaker areas.'}
                {attempt.percentage >= 50 && attempt.percentage < 60 && '🔄 Nearly there! More practice needed.'}
                {attempt.percentage < 50 && '💪 Keep studying! Review the material and try again.'}
              </div>
            </div>
          </div>

          {/* Marks bar visual */}
          <div className="marks-bar-card">
            <h3 className="bar-title">Score Breakdown</h3>
            <div className="marks-bar-track">
              <div
                className="marks-bar-fill"
                style={{ width: `${attempt.percentage}%`, backgroundColor: gradeColor }}
              ></div>
            </div>
            <div className="bar-labels">
              <span>0</span>
              <span style={{ color: gradeColor, fontWeight: 700 }}>{attempt.totalScore}/{attempt.totalMarks}</span>
            </div>

            {/* Per-question breakdown strip */}
            <div className="question-strip">
              {attempt.answers.map((a, i) => (
                <div
                  key={i}
                  className={`strip-item ${a.isCorrect ? 'correct' : 'wrong'}`}
                  title={`Q${i + 1}: ${a.isCorrect ? 'Correct' : 'Wrong'}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="strip-legend">
              <span><span className="strip-dot correct"></span> Correct</span>
              <span><span className="strip-dot wrong"></span> Incorrect</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="result-actions">
          <button className="btn-secondary-r" onClick={() => navigate(quizHomePath)}>
            ← Back to Quizzes
          </button>
          <button className="btn-secondary-r" onClick={() => navigate(progressPath)}>
            📈 View Progress
          </button>
          <button
            className="btn-toggle-review"
            onClick={() => setShowReview(!showReview)}
          >
            {showReview ? '🔼 Hide Review' : '🔍 Review Answers'}
          </button>
          <button
            className="btn-retake"
            onClick={() => navigate(`/quizzes/${attempt.quiz?._id || attempt.quiz}/attempt`)}
          >
            🔄 Retake Quiz
          </button>
        </div>

        {/* Answer Review */}
        {showReview && (
          <div className="answer-review">
            <h2 className="review-title">📋 Answer Review</h2>
            {attempt.answers.map((a, i) => (
              <div key={i} className={`review-item ${a.isCorrect ? 'correct' : 'wrong'}`}>
                <div className="review-q-header">
                  <span className="review-q-num">Q{i + 1}</span>
                  <span className={`review-status ${a.isCorrect ? 'correct' : 'wrong'}`}>
                    {a.isCorrect ? '✅ Correct' : '❌ Incorrect'}
                  </span>
                  <span className="review-marks">{a.marksObtained}/{a.maxMarks} marks</span>
                </div>
                <p className="review-q-text">{a.questionText}</p>
                <div className="review-answers">
                  <div className={`answer-row ${a.isCorrect ? 'selected-correct' : 'selected-wrong'}`}>
                    <span className="answer-label">Your answer:</span>
                    <span className="answer-value">
                      {a.questionType === 'MCQ' && a.selectedAnswer !== ''
                        ? (isNaN(Number(a.selectedAnswer)) 
                            ? a.selectedAnswer 
                            : `${String.fromCharCode(65 + Number(a.selectedAnswer))}. ${a.selectedAnswerText || `(option ${Number(a.selectedAnswer) + 1})`}`)
                        : a.selectedAnswer || '(no answer)'}
                    </span>
                  </div>
                  {!a.isCorrect && (
                    <div className="answer-row correct-answer">
                      <span className="answer-label">Correct answer:</span>
                      <span className="answer-value">
                        {a.questionType === 'MCQ'
                          ? (isNaN(Number(a.correctAnswer)) 
                              ? a.correctAnswer 
                              : `${String.fromCharCode(65 + Number(a.correctAnswer))}. ${a.correctAnswerText || `(option ${Number(a.correctAnswer) + 1})`}`)
                          : a.correctAnswer}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
};

export default QuizResults;
