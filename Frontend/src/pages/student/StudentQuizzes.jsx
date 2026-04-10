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

const SETTINGS_STORAGE_KEY = 'student-settings-preferences';
const THEME_STORAGE_KEY = 'student-theme-mode';

const QUIZ_COVER_IMAGES = [
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1400&q=80'
];

const getQuizCover = (quiz, index) => {
  const seed = String(quiz?._id || quiz?.title || quiz?.subject || index || '0');
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return QUIZ_COVER_IMAGES[hash % QUIZ_COVER_IMAGES.length];
};

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
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [premiumFilter, setPremiumFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;

      const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsed = rawSettings ? JSON.parse(rawSettings) : null;
      if (parsed && typeof parsed.darkMode === 'boolean') {
        return parsed.darkMode ? 'dark' : 'light';
      }
    } catch {
      // Ignore malformed storage values.
    }
    return 'light';
  });
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

  const subjectOptions = useMemo(() => {
    const subjects = new Set(
      quizzes
        .map((quiz) => String(quiz.subject || '').trim())
        .filter(Boolean)
    );
    return ['all', ...Array.from(subjects)];
  }, [quizzes]);

  const difficultyOptions = useMemo(() => {
    const difficulties = new Set(
      quizzes
        .map((quiz) => String(quiz.difficulty || '').trim())
        .filter(Boolean)
    );
    return ['all', ...Array.from(difficulties)];
  }, [quizzes]);

  const visibleQuizzes = useMemo(() => {
    const byTab = (() => {
      if (activeTab === 'started') {
        return quizzes.filter((quiz) => startedQuizSet.has(quiz._id) && !completedQuizIds.has(quiz._id));
      }
      if (activeTab === 'completed') {
        return quizzes.filter((quiz) => completedQuizIds.has(quiz._id));
      }
      return quizzes;
    })();

    const bySubject = subjectFilter === 'all'
      ? byTab
      : byTab.filter((quiz) => String(quiz.subject || '').trim() === subjectFilter);

    const byDifficulty = difficultyFilter === 'all'
      ? bySubject
      : bySubject.filter((quiz) => String(quiz.difficulty || '').trim() === difficultyFilter);

    const byPremium = premiumFilter === 'all'
      ? byDifficulty
      : byDifficulty.filter((quiz) => (premiumFilter === 'premium' ? Boolean(quiz.isPremium) : !quiz.isPremium));

    const q = searchQuery.trim().toLowerCase();
    if (!q) return byPremium;

    return byPremium.filter((quiz) => {
      const title = String(quiz.title || '').toLowerCase();
      const subject = String(quiz.subject || '').toLowerCase();
      const difficulty = String(quiz.difficulty || '').toLowerCase();
      const questionCount = String(quiz.questions?.length || 0);
      const timeLimit = String(quiz.timeLimit || 0);
      return (
        title.includes(q)
        || subject.includes(q)
        || difficulty.includes(q)
        || questionCount.includes(q)
        || timeLimit.includes(q)
      );
    });
  }, [activeTab, quizzes, startedQuizSet, completedQuizIds, subjectFilter, difficultyFilter, premiumFilter, searchQuery]);

  const featuredQuiz = visibleQuizzes[0] || quizzes[0] || null;
  const isDarkMode = themeMode === 'dark';

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const heroSubtitle = useMemo(() => {
    if (!featuredQuiz) return 'Pick a quiz by category and sharpen your exam performance.';
    return `${featuredQuiz.subject || 'General'} • ${featuredQuiz.questions?.length || 0} questions • ${featuredQuiz.timeLimit || 0} mins`;
  }, [featuredQuiz]);

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
    { icon: '🎥', label: 'Kuppi Sessions', route: '/sessions' },
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
    <div className={`student-v2-shell student-quizzes-shell ${isDarkMode ? 'theme-dark' : ''}`}>
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
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="student-v2-tools">
            <button
              type="button"
              className="ghost-icon"
              aria-label="Theme"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={handleToggleTheme}
            >
              {isDarkMode ? '☀' : '◐'}
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

        <div className="student-quizzes-page">
          <div className="student-quizzes-header">
            <div className="student-quizzes-header-copy">
              <h1>Quiz & Mock Exams</h1>
              <p>{heroSubtitle}</p>
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

          <div className="quiz-toolbar">
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

            <div className="toolbar-filters" role="group" aria-label="Quiz filters">
              <label htmlFor="subject-filter">Subject</label>
              <select
                id="subject-filter"
                className="quiz-filter-select"
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
              >
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject === 'all' ? 'All Subjects' : subject}
                  </option>
                ))}
              </select>

              <label htmlFor="difficulty-filter">Difficulty</label>
              <select
                id="difficulty-filter"
                className="quiz-filter-select"
                value={difficultyFilter}
                onChange={(event) => setDifficultyFilter(event.target.value)}
              >
                {difficultyOptions.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty === 'all' ? 'All Levels' : difficulty}
                  </option>
                ))}
              </select>

              <label htmlFor="premium-filter">Quiz Type</label>
              <select
                id="premium-filter"
                className="quiz-filter-select"
                value={premiumFilter}
                onChange={(event) => setPremiumFilter(event.target.value)}
              >
                <option value="all">All Quizzes</option>
                <option value="premium">Premium Only</option>
                <option value="free">Free Only</option>
              </select>

              <button
                type="button"
                className="clear-filter-btn"
                onClick={() => {
                  setSubjectFilter('all');
                  setDifficultyFilter('all');
                  setPremiumFilter('all');
                  setSearchQuery('');
                  setActiveTab('all');
                }}
              >
                Clear
              </button>
            </div>
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
              {searchQuery.trim() && `No quiz results for "${searchQuery}". `}
              {activeTab === 'started' && 'No started quizzes yet. Click Start Quiz to begin an exam.'}
              {activeTab === 'completed' && 'No completed quizzes yet. Submit a quiz to see it here.'}
              {activeTab === 'all' && 'No quizzes available for selected filters.'}
            </div>
          ) : (
            <div className="quiz-card-grid">
              {visibleQuizzes.map((quiz, index) => {
                const latestAttempt = latestAttemptByQuizId[quiz._id];
                const isCompleted = completedQuizIds.has(quiz._id);
                const isStarted = startedQuizSet.has(quiz._id) && !isCompleted;
                const isPremiumLocked = Boolean(quiz.isPremium) && !premiumMetaByQuizId[quiz._id]?.hasAccess;
                return (
                  <div key={quiz._id} className="quiz-card">
                    <div
                      className="quiz-card-cover"
                      style={{ backgroundImage: `linear-gradient(140deg, rgba(22, 54, 143, 0.45), rgba(20, 92, 178, 0.28)), url(${getQuizCover(quiz, index)})` }}
                    >
                      <div className="quiz-pill-group">
                        <span className="difficulty-pill">{quiz.difficulty}</span>
                        {quiz.isPremium && <span className="premium-quiz-pill">Premium</span>}
                      </div>
                      <span className="quiz-card-time">{quiz.timeLimit || 0} mins</span>
                    </div>

                    <div className="quiz-card-top">
                      <h3>{quiz.title}</h3>
                      <p className="quiz-subject">{quiz.subject}</p>
                    </div>
                    <p className="quiz-meta">
                      {quiz.questions?.length || 0} questions • Mock exam ready
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
