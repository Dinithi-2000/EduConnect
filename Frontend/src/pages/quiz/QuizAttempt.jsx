import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { getQuizById, submitAttempt } from '../../services/quizService';
import './QuizAttempt.css';

const QuizAttempt = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState({}); // { questionId: selectedAnswer }
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [submitting, setSubmitting] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await getQuizById(id);
        setQuiz(res.data);
        setTimeLeft(res.data.timeLimit * 60);
      } catch { setError('Quiz not found or server error.'); }
      finally { setLoading(false); }
    };
    fetchQuiz();
  }, [id]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (timedOut = false) => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    const timeTaken = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    const answersArray = quiz.questions.map(q => ({
      questionId: q._id,
      selectedAnswer: answers[q._id] || ''
    }));
    try {
      const res = await submitAttempt(id, {
        answers: answersArray,
        timeTaken,
        status: timedOut ? 'timed-out' : 'submitted'
      });
      navigate(`/quizzes/results/${res.data._id}`);
    } catch {
      setError('Failed to submit. Please try again.');
      setSubmitting(false);
    }
  }, [submitting, quiz, answers, id, navigate]);

  useEffect(() => {
    if (!started || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, handleSubmit]);

  const startQuiz = () => {
    startTimeRef.current = Date.now();
    setStarted(true);
  };

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const answeredCount = quiz ? quiz.questions.filter(q => answers[q._id] !== undefined && answers[q._id] !== '').length : 0;
  const totalQ = quiz ? quiz.questions.length : 0;
  const progressPct = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;
  const isLowTime = timeLeft <= 60 && timeLeft > 0;

  if (loading) return (
    <DashboardLayout>
      <div className="attempt-loading"><div className="spinner"></div><p>Loading quiz...</p></div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="attempt-error"><span>⚠️</span><p>{error}</p><button className="btn-primary" onClick={() => navigate('/quizzes')}>Back to Quizzes</button></div>
    </DashboardLayout>
  );

  // ── Start Screen ───────────────────────────────────────────────────────────
  if (!started) return (
    <DashboardLayout>
      <div className="start-screen">
        <div className="start-card">
          <div className="start-icon">📝</div>
          <h1 className="start-title">{quiz.title}</h1>
          <p className="start-subject">{quiz.subject}</p>
          <div className="start-meta">
            <div className="meta-box">
              <span className="meta-label">Questions</span>
              <span className="meta-value">{quiz.questions.length}</span>
            </div>
            <div className="meta-box">
              <span className="meta-label">Time Limit</span>
              <span className="meta-value">{quiz.timeLimit} min</span>
            </div>
            <div className="meta-box">
              <span className="meta-label">Total Marks</span>
              <span className="meta-value">{quiz.totalMarks}</span>
            </div>
            <div className="meta-box">
              <span className="meta-label">Difficulty</span>
              <span className="meta-value">{quiz.difficulty}</span>
            </div>
          </div>
          {quiz.description && <p className="start-description">{quiz.description}</p>}
          <div className="start-rules">
            <h3>📋 Instructions</h3>
            <ul>
              <li>You have <strong>{quiz.timeLimit} minutes</strong> to complete this quiz.</li>
              <li>The timer starts when you click <strong>Start Quiz</strong>.</li>
              <li>The quiz auto-submits when time runs out.</li>
              <li>You can navigate between questions freely.</li>
              <li>Unanswered questions will be marked as incorrect.</li>
            </ul>
          </div>
          <button className="start-btn" onClick={startQuiz}>▶ Start Quiz</button>
          <button className="back-btn-sm" onClick={() => navigate('/quizzes')}>← Back to Quizzes</button>
        </div>
      </div>
    </DashboardLayout>
  );

  const currentQuestion = quiz.questions[currentQ];

  return (
    <DashboardLayout>
      <div className="quiz-attempt-page">
        {/* Top bar: title + timer */}
        <div className="attempt-topbar">
          <div className="attempt-title-area">
            <h2 className="attempt-quiz-title">{quiz.title}</h2>
            <span className="attempt-progress-text">{answeredCount}/{totalQ} answered</span>
          </div>
          <div className={`timer-badge ${isLowTime ? 'low-time' : ''}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-bar-wrapper">
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }}></div>
          </div>
          <span className="progress-pct">{progressPct}%</span>
        </div>

        <div className="attempt-body">
          {/* Question Navigator (sidebar) */}
          <div className="question-nav">
            <p className="q-nav-title">Questions</p>
            <div className="q-nav-grid">
              {quiz.questions.map((q, i) => (
                <button
                  key={i}
                  className={`q-nav-btn ${i === currentQ ? 'current' : ''} ${answers[q._id] ? 'answered' : ''}`}
                  onClick={() => setCurrentQ(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="q-nav-legend">
              <span className="legend-item"><span className="legend-dot answered"></span> Answered</span>
              <span className="legend-item"><span className="legend-dot current"></span> Current</span>
              <span className="legend-item"><span className="legend-dot"></span> Unanswered</span>
            </div>
          </div>

          {/* Current Question */}
          <div className="question-panel">
            <div className="question-card-attempt">
              <div className="q-header-row">
                <span className="q-num-badge">Question {currentQ + 1} of {totalQ}</span>
                <span className="q-marks-badge">⭐ {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}</span>
              </div>

              <p className="question-text">{currentQuestion.questionText}</p>

              {/* MCQ */}
              {currentQuestion.questionType === 'MCQ' && (
                <div className="options-list">
                  {currentQuestion.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`option-label-attempt ${answers[currentQuestion._id] === String(oi) ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`q-${currentQ}`}
                        value={String(oi)}
                        checked={answers[currentQuestion._id] === String(oi)}
                        onChange={() => handleAnswer(currentQuestion._id, String(oi))}
                      />
                      <span className="option-letter">{String.fromCharCode(65 + oi)}</span>
                      <span className="option-text">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* True / False */}
              {currentQuestion.questionType === 'TrueFalse' && (
                <div className="tf-list">
                  {['True', 'False'].map(tf => (
                    <label key={tf} className={`option-label-attempt tf-attempt ${answers[currentQuestion._id] === tf ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name={`q-${currentQ}`}
                        value={tf}
                        checked={answers[currentQuestion._id] === tf}
                        onChange={() => handleAnswer(currentQuestion._id, tf)}
                      />
                      <span className="tf-icon">{tf === 'True' ? '✅' : '❌'}</span>
                      {tf}
                    </label>
                  ))}
                </div>
              )}

              {/* Short Answer */}
              {currentQuestion.questionType === 'ShortAnswer' && (
                <div className="short-answer-area">
                  <textarea
                    className="short-answer-input"
                    rows={4}
                    placeholder="Type your answer here..."
                    value={answers[currentQuestion._id] || ''}
                    onChange={e => handleAnswer(currentQuestion._id, e.target.value)}
                  />
                </div>
              )}

              {/* Navigation buttons */}
              <div className="q-nav-buttons">
                <button
                  className="btn-nav"
                  onClick={() => setCurrentQ(p => Math.max(p - 1, 0))}
                  disabled={currentQ === 0}
                >
                  ← Previous
                </button>
                <button
                  className="btn-clear"
                  onClick={() => handleAnswer(currentQuestion._id, '')}
                >
                  Clear Answer
                </button>
                {currentQ < totalQ - 1 ? (
                  <button className="btn-nav primary" onClick={() => setCurrentQ(p => p + 1)}>
                    Next →
                  </button>
                ) : (
                  <button
                    className="btn-submit-quiz"
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : '🚀 Submit Quiz'}
                  </button>
                )}
              </div>
            </div>

            {/* Final submit at bottom */}
            {answeredCount === totalQ && (
              <div className="all-answered-banner">
                ✅ All questions answered!
                <button className="btn-submit-quiz" onClick={() => handleSubmit(false)} disabled={submitting}>
                  {submitting ? 'Submitting...' : '🚀 Submit Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QuizAttempt;
