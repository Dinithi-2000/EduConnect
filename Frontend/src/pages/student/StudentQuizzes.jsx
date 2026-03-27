import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AIChatWidget from '../../components/AIChatWidget';
import {
  completeStripeCheckout,
  createStripeCheckoutSession,
  getMyProgress,
  getPremiumQuizzes,
  getQuizzes
} from '../../services/quizService';
import '../StudentDashboard.css';
import './StudentQuizzes.css';

const StudentQuizzes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [progress, setProgress] = useState({ summary: { totalAttempts: 0, averageScore: 0, bestScore: 0 }, attempts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [startedQuizIds, setStartedQuizIds] = useState([]);
  const [premiumMetaByQuizId, setPremiumMetaByQuizId] = useState({});
  const [purchasingQuizId, setPurchasingQuizId] = useState('');
  const [verifyingCheckout, setVerifyingCheckout] = useState(false);
  const [selectedPremiumQuiz, setSelectedPremiumQuiz] = useState(null);

  const studentId = user?._id || user?.id || 'guest';
  const startedStorageKey = `student-started-quizzes-${studentId}`;

  useEffect(() => {
    try {
      const savedStarted = localStorage.getItem(startedStorageKey);
      setStartedQuizIds(savedStarted ? JSON.parse(savedStarted) : []);
    } catch {
      setStartedQuizIds([]);
    }
  }, [startedStorageKey]);

  useEffect(() => {
    localStorage.setItem(startedStorageKey, JSON.stringify(startedQuizIds));
  }, [startedQuizIds, startedStorageKey]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [quizRes, progressRes, premiumRes] = await Promise.all([
        getQuizzes(),
        getMyProgress(),
        getPremiumQuizzes().catch(() => ({ data: [] }))
      ]);
      setQuizzes(quizRes.data || []);
      setProgress(progressRes.data || { summary: { totalAttempts: 0, averageScore: 0, bestScore: 0 }, attempts: [] });

      const premiumMetaMap = (premiumRes.data || []).reduce((acc, quiz) => {
        if (!quiz?._id) return acc;
        acc[quiz._id] = {
          hasAccess: Boolean(quiz.hasAccess),
          premiumItemId: quiz.premiumItemId || `quiz-premium-${quiz._id}`
        };
        return acc;
      }, {});
      setPremiumMetaByQuizId(premiumMetaMap);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load quizzes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');

    if (payment !== 'success' || !sessionId) {
      return;
    }

    const finalizeStripeCheckout = async () => {
      try {
        setVerifyingCheckout(true);
        await completeStripeCheckout({ sessionId });
        await loadData();
      } catch (err) {
        setError(err?.response?.data?.message || 'Stripe payment verification failed.');
      } finally {
        setVerifyingCheckout(false);
        navigate('/student/quizzes', { replace: true });
      }
    };

    finalizeStripeCheckout();
  }, [location.search, loadData, navigate]);

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

  const completedQuizIds = useMemo(() => {
    return new Set(Object.keys(latestAttemptByQuizId));
  }, [latestAttemptByQuizId]);

  useEffect(() => {
    const cleaned = startedQuizIds.filter((quizId) => !completedQuizIds.has(quizId));
    if (cleaned.length !== startedQuizIds.length) {
      setStartedQuizIds(cleaned);
    }
  }, [completedQuizIds, startedQuizIds]);

  const startedQuizSet = useMemo(() => new Set(startedQuizIds), [startedQuizIds]);

  const tabCounts = useMemo(() => {
    const completed = quizzes.filter((quiz) => completedQuizIds.has(quiz._id)).length;
    const started = quizzes.filter((quiz) => startedQuizSet.has(quiz._id) && !completedQuizIds.has(quiz._id)).length;
    return {
      all: quizzes.length,
      started,
      completed
    };
  }, [quizzes, startedQuizSet, completedQuizIds]);

  const visibleQuizzes = useMemo(() => {
    if (activeTab === 'started') {
      return quizzes.filter((quiz) => startedQuizSet.has(quiz._id) && !completedQuizIds.has(quiz._id));
    }
    if (activeTab === 'completed') {
      return quizzes.filter((quiz) => completedQuizIds.has(quiz._id));
    }
    return quizzes;
  }, [activeTab, quizzes, startedQuizSet, completedQuizIds]);

  const displayName = user?.name || 'Student';
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sidebarItems = [
    { icon: '▦', label: 'Dashboard', route: '/student-dashboard' },
    { icon: '🎓', label: 'My Courses', route: '/student/my-courses' },
    { icon: '📚', label: 'Course & Contents', route: '/student/courses' },
    { icon: '📝', label: 'Quiz & Mock Exams', route: '/student/quizzes', active: true },
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

  const handleStartQuiz = (quizId) => {
    setStartedQuizIds((prev) => (prev.includes(quizId) ? prev : [...prev, quizId]));
    navigate(`/quizzes/${quizId}/attempt`);
  };

  const handleOpenPremiumCheckout = (quiz) => {
    setSelectedPremiumQuiz(quiz);
  };

  const handleClosePremiumCheckout = () => {
    if (purchasingQuizId) return;
    setSelectedPremiumQuiz(null);
  };

  const handleUnlockPremiumQuiz = async () => {
    if (!selectedPremiumQuiz) return;

    const quiz = selectedPremiumQuiz;
    const premiumMeta = premiumMetaByQuizId[quiz._id] || {};
    const premiumItemId = premiumMeta.premiumItemId || `quiz-premium-${quiz._id}`;

    setPurchasingQuizId(quiz._id);
    try {
      const sessionPayload = {
        premiumItemId,
        successUrl: `${window.location.origin}/student/payment-success?source=quizzes`,
        cancelUrl: `${window.location.origin}/student/payment-success?payment=cancelled&source=quizzes`
      };

      const session = await createStripeCheckoutSession(sessionPayload);
      const checkoutUrl = session?.data?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error('Stripe checkout URL was not returned by the server.');
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to start Stripe checkout.');
      setPurchasingQuizId('');
      setSelectedPremiumQuiz(null);
    }
  };

  const handleQuizAction = (quiz) => {
    if (quiz.isPremium && !premiumMetaByQuizId[quiz._id]?.hasAccess) {
      handleOpenPremiumCheckout(quiz);
      return;
    }
    handleStartQuiz(quiz._id);
  };

  return (
    <div className="student-v2-shell student-quizzes-shell">
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

      <main className="student-v2-main student-quizzes-main">
        <header className="student-v2-topbar">
          <div className="student-v2-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              placeholder="Search quizzes, subjects, attempts..."
              aria-label="Search quizzes, subjects, attempts"
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

        <div className="student-quizzes-page">
          <div className="student-quizzes-header">
            <div>
              <h1>Quiz & Mock Exams</h1>
              <p>Attempt quizzes, review your latest score, and improve each round.</p>
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

          <div className="quiz-tabs" role="tablist" aria-label="Quiz status tabs">
            <button
              type="button"
              className={`quiz-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Quizzes <span>{tabCounts.all}</span>
            </button>
            <button
              type="button"
              className={`quiz-tab ${activeTab === 'started' ? 'active' : ''}`}
              onClick={() => setActiveTab('started')}
            >
              Started <span>{tabCounts.started}</span>
            </button>
            <button
              type="button"
              className={`quiz-tab ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Completed <span>{tabCounts.completed}</span>
            </button>
          </div>

          {verifyingCheckout && (
            <div className="state-box">Verifying Stripe payment and unlocking premium quiz...</div>
          )}

          {loading ? (
            <div className="state-box">Loading quizzes...</div>
          ) : error ? (
            <div className="state-box error">{error}</div>
          ) : visibleQuizzes.length === 0 ? (
            <div className="state-box">
              {activeTab === 'started' && 'No started quizzes yet. Click Start Quiz to begin an exam.'}
              {activeTab === 'completed' && 'No completed quizzes yet. Submit a quiz to see it here.'}
              {activeTab === 'all' && 'No quizzes available yet.'}
            </div>
          ) : (
            <div className="quiz-card-grid">
              {visibleQuizzes.map((quiz) => {
                const latestAttempt = latestAttemptByQuizId[quiz._id];
                const isCompleted = completedQuizIds.has(quiz._id);
                const isStarted = startedQuizSet.has(quiz._id) && !isCompleted;
                const isPremiumLocked = Boolean(quiz.isPremium) && !premiumMetaByQuizId[quiz._id]?.hasAccess;
                return (
                  <div key={quiz._id} className="quiz-card">
                    <div className="quiz-card-top">
                      <h3>{quiz.title}</h3>
                      <div className="quiz-pill-group">
                        <span className="difficulty-pill">{quiz.difficulty}</span>
                        {quiz.isPremium && <span className="premium-quiz-pill">Premium</span>}
                      </div>
                    </div>

                    <p className="quiz-subject">{quiz.subject}</p>
                    <p className="quiz-meta">
                      {quiz.questions?.length || 0} questions • {quiz.timeLimit || 0} mins
                    </p>
                    {quiz.isPremium && (
                      <p className="quiz-premium-price">
                        {(quiz.premiumCurrency || 'USD').toUpperCase()} {Number(quiz.premiumPrice || 0).toFixed(2)}
                      </p>
                    )}

                    {isCompleted ? (
                      <div className="quiz-status completed">Completed</div>
                    ) : isStarted ? (
                      <div className="quiz-status started">Started</div>
                    ) : (
                      <div className="quiz-status not-started">Not Started</div>
                    )}

                    {latestAttempt ? (
                      <div className="latest-attempt">
                        <span>Latest Score: <strong>{latestAttempt.percentage}%</strong></span>
                        <small>{new Date(latestAttempt.submittedAt).toLocaleString()}</small>
                      </div>
                    ) : (
                      <div className="latest-attempt empty">Not attempted yet</div>
                    )}

                    <div className="quiz-actions">
                      <button onClick={() => handleQuizAction(quiz)} disabled={purchasingQuizId === quiz._id || verifyingCheckout}>
                        {isPremiumLocked
                          ? (purchasingQuizId === quiz._id ? 'Redirecting to Stripe...' : 'Unlock Premium')
                          : (latestAttempt ? 'Re-attempt Quiz' : 'Start Quiz')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <AIChatWidget
          studentId={user?._id || 'guest-student'}
          context={{
            page: 'student-quizzes',
            user: {
              id: user?._id,
              name: user?.name,
              role: user?.role
            }
          }}
          openSignal={chatOpenSignal}
        />

        {selectedPremiumQuiz && (
          <div className="premium-pay-overlay" role="presentation" onClick={handleClosePremiumCheckout}>
            <div className="premium-pay-modal" role="dialog" aria-modal="true" aria-labelledby="premium-payment-title" onClick={(event) => event.stopPropagation()}>
              <div className="premium-pay-head">
                <span className="premium-pay-badge">Premium Quiz</span>
                <button type="button" className="premium-pay-close" onClick={handleClosePremiumCheckout} aria-label="Close premium checkout">
                  ×
                </button>
              </div>

              <h3 id="premium-payment-title">Unlock with Stripe Checkout</h3>
              <p className="premium-pay-subtitle">
                Complete a secure one-time payment to unlock this premium quiz instantly.
              </p>

              <div className="premium-pay-quiz-card">
                <h4>{selectedPremiumQuiz.title}</h4>
                <p>{selectedPremiumQuiz.subject} • {selectedPremiumQuiz.questions?.length || 0} Questions • {selectedPremiumQuiz.timeLimit || 0} mins</p>
                <strong>
                  {(selectedPremiumQuiz.premiumCurrency || 'USD').toUpperCase()} {Number(selectedPremiumQuiz.premiumPrice || 0).toFixed(2)}
                </strong>
              </div>

              <ul className="premium-pay-list">
                <li>Payment gateway: Stripe</li>
                <li>Access is granted immediately after successful payment</li>
                <li>You can re-attempt the unlocked quiz anytime</li>
              </ul>

              <div className="premium-pay-actions">
                <button type="button" className="premium-pay-cancel" onClick={handleClosePremiumCheckout} disabled={Boolean(purchasingQuizId)}>
                  Cancel
                </button>
                <button type="button" className="premium-pay-confirm" onClick={handleUnlockPremiumQuiz} disabled={purchasingQuizId === selectedPremiumQuiz._id || verifyingCheckout}>
                  {purchasingQuizId === selectedPremiumQuiz._id ? 'Redirecting to Stripe...' : 'Pay with Stripe'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentQuizzes;
