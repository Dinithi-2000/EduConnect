import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AIChatWidget from '../../components/AIChatWidget';
import {
  createStripeCheckoutSession,
  getPaymentGatewayStatus,
  getPremiumCatalog
} from '../../services/commerceService';
import '../StudentDashboard.css';
import './StudentPremium.css';

const StudentPremium = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [catalog, setCatalog] = useState([]);
  const [gateway, setGateway] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutLoadingId, setCheckoutLoadingId] = useState('');
  const [chatOpenSignal, setChatOpenSignal] = useState(0);

  const loadPremiumData = async () => {
    try {
      setLoading(true);
      setError('');
      const [catalogRes, gatewayRes] = await Promise.all([
        getPremiumCatalog(),
        getPaymentGatewayStatus()
      ]);

      setCatalog(catalogRes?.data || []);
      setGateway(gatewayRes?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load premium catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPremiumData();
  }, []);

  const normalizedCatalog = useMemo(() => {
    return (catalog || []).map((item) => {
      const type = item.type || (item.id?.startsWith('quiz-')
        ? 'quiz'
        : item.id?.startsWith('course-')
          ? 'course'
          : 'kuppi');

      return { ...item, type, hasAccess: Boolean(item.hasAccess) };
    });
  }, [catalog]);

  const unlockedPremiumQuizzes = useMemo(() => {
    return normalizedCatalog.filter((item) => item.type === 'quiz' && item.hasAccess);
  }, [normalizedCatalog]);

  const lockedPremiumItems = useMemo(() => {
    return normalizedCatalog.filter((item) => !item.hasAccess);
  }, [normalizedCatalog]);

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
    { icon: '📝', label: 'Quiz & Mock Exams', route: '/student/quizzes' },
    { icon: '🎥', label: 'Kuppi Sessions', route: '/student/courses' },
    { icon: '💬', label: 'Community Board', route: '/student/community' },
    { icon: '📈', label: 'Progress Analytics', route: '/student/progress' },
    { icon: '👑', label: 'Premium', route: '/student/premium', active: true },
    { icon: '🤖', label: 'AI Chatbot', action: () => setChatOpenSignal((prev) => prev + 1) },
    { icon: '⚙', label: 'Settings', route: '/settings' }
  ];

  const premiumBenefits = [
    {
      title: 'AI-Powered Mock Exams',
      description: 'Dynamic testing that adapts to your weak spots in real-time.',
      icon: '✹'
    },
    {
      title: 'Exclusive Kuppi Sessions',
      description: 'Join intimate live sessions with top-tier subject experts.',
      icon: '▶'
    },
    {
      title: 'Detailed Performance Analytics',
      description: 'Granular insights into your learning curve and exam readiness.',
      icon: '▤'
    },
    {
      title: 'Early Access Materials',
      description: 'Get curated course content 7 days before everyone else.',
      icon: '✦'
    }
  ];

  const mockExams = [
    {
      day: '24',
      month: 'OCT',
      title: 'Medical Science: Advanced Physiology',
      time: '10:00 AM - 1:00 PM'
    },
    {
      day: '02',
      month: 'NOV',
      title: 'Data Science: Neural Networks Masterclass',
      time: '2:30 PM - 5:30 PM'
    }
  ];

  const handleCheckout = async (item) => {
    if (item.hasAccess) return;
    try {
      setCheckoutLoadingId(item.id);
      const session = await createStripeCheckoutSession({
        premiumItemId: item.id,
        successUrl: `${window.location.origin}/student/payment-success?source=premium`,
        cancelUrl: `${window.location.origin}/student/payment-success?payment=cancelled&source=premium`
      });

      const checkoutUrl = session?.data?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error('Checkout URL was not returned by server.');
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      alert(err?.response?.data?.message || 'Unable to start checkout right now.');
      setCheckoutLoadingId('');
    }
  };

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

  const getQuizIdFromItem = (itemId) => String(itemId || '').replace('quiz-premium-', '');

  const handleStartUnlockedQuiz = (itemId) => {
    const quizId = getQuizIdFromItem(itemId);
    if (!quizId || quizId === itemId) {
      navigate('/student/quizzes');
      return;
    }
    navigate(`/quizzes/${quizId}/attempt`);
  };

  return (
    <div className="student-v2-shell student-premium-shell">
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

      <main className="student-v2-main student-premium-main">
        <header className="student-v2-topbar">
          <div className="student-v2-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              placeholder="Search resources..."
              aria-label="Search resources"
            />
          </div>

          <div className="student-v2-tools">
            <button type="button" className="ghost-icon" aria-label="Search">⌕</button>
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

        <div className="student-premium-page">
          <section className="premium-hero-banner">
            <div className="hero-copy">
              <span className="elite-badge">EduConnect Elite</span>
              <h1>Unlock Your Full Academic Potential</h1>
              <p>Your premium subscription is active. Access your exclusive benefits and accelerated learning tools below.</p>
              <div className="hero-actions">
                <button type="button" onClick={() => document.getElementById('premium-benefits')?.scrollIntoView({ behavior: 'smooth' })}>Explore Benefits</button>
                <button type="button" className="ghost" onClick={() => document.getElementById('purchased-quizzes')?.scrollIntoView({ behavior: 'smooth' })}>My Rewards</button>
                </div>
            </div>
            <div className="hero-stars" aria-hidden="true">
              <span>✦</span>
              <span>✧</span>
              <span>✦</span>
            </div>
          </section>

          <section id="premium-benefits" className="premium-section">
            <div className="section-head">
              <h2>Premium Benefits</h2>
              <p>Exclusive tools tailored for your success</p>
            </div>
            <div className="benefits-grid">
              {premiumBenefits.map((benefit) => (
                <article key={benefit.title} className="benefit-card">
                  <div className="benefit-icon">{benefit.icon}</div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="purchased-quizzes" className="premium-section">
            <div className="section-head row">
              <div>
                <h2>Purchased Premium Quizzes</h2>
                <p>Start practicing with your unlocked premium quiz library</p>
              </div>
              <button type="button" className="view-link" onClick={() => navigate('/student/quizzes')}>View Library</button>
            </div>

            {loading ? (
              <div className="premium-v2-state">Loading purchased quizzes...</div>
            ) : error ? (
              <div className="premium-v2-state error">{error}</div>
            ) : unlockedPremiumQuizzes.length === 0 ? (
              <div className="premium-v2-state">No unlocked premium quizzes yet. Unlock one below to get started.</div>
            ) : (
              <div className="quiz-library-grid">
                {unlockedPremiumQuizzes.map((item, index) => (
                  <article key={item.id} className="library-card">
                    <div className={`library-thumb thumb-${(index % 4) + 1}`} />
                    <div className="library-meta">
                      <span>Unlocked</span>
                      <small>{(item.currency || 'USD').toUpperCase()} {Number(item.amount || 0).toFixed(2)} Value</small>
                    </div>
                    <h3>{item.title}</h3>
                    <button type="button" onClick={() => handleStartUnlockedQuiz(item.id)}>Start Quiz</button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="premium-bottom-grid">
            <div className="premium-section">
              <div className="section-head">
                <h2>Premium Mock Exams</h2>
                <p>Reserve your seat in upcoming premium live assessments</p>
              </div>
              <div className="mock-list">
                {mockExams.map((exam) => (
                  <article key={exam.title} className="mock-item">
                    <div className="mock-date">
                      <small>{exam.month}</small>
                      <strong>{exam.day}</strong>
                    </div>
                    <div className="mock-copy">
                      <h3>{exam.title}</h3>
                      <p>{exam.time}</p>
                    </div>
                    <button type="button">Join Waiting List</button>
                  </article>
                ))}
              </div>
            </div>

            <aside className="plan-card">
              <h3>Plan Comparison</h3>
              <article className="plan basic">
                <div className="plan-row">
                  <strong>Basic Plan</strong>
                  <span>Current</span>
                </div>
                <p>Standard access to public forums and basic course materials.</p>
              </article>
              <article className="plan pro">
                <div className="plan-row">
                  <strong>Pro Plan</strong>
                  <span>Active</span>
                </div>
                <p>Unlimited AI tests, exclusive sessions, and advanced insights.</p>
                <div className="price">$24.99 <small>/month</small></div>
              </article>
              <button type="button" onClick={loadPremiumData}>Manage Subscription</button>
            </aside>
          </section>

          <section className="premium-section">
            <div className="section-head row">
              <div>
                <h2>Available Premium Content</h2>
                <p>Unlock more premium quizzes and courses with Stripe checkout</p>
              </div>
              <button type="button" className="view-link" onClick={loadPremiumData}>Refresh</button>
            </div>

            {loading ? (
              <div className="premium-v2-state">Loading premium catalog...</div>
            ) : error ? (
              <div className="premium-v2-state error">{error}</div>
            ) : lockedPremiumItems.length === 0 ? (
              <div className="premium-v2-state">All premium items are already unlocked.</div>
            ) : (
              <div className="unlock-grid">
                {lockedPremiumItems.map((item) => (
                  <article key={item.id} className="unlock-card">
                    <div className="unlock-top">
                      <span className={`unlock-type ${item.type}`}>{item.type}</span>
                      <small>{item.id}</small>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{(item.currency || 'USD').toUpperCase()} {Number(item.amount || 0).toFixed(2)}</p>
                    <button
                      type="button"
                      disabled={!gateway?.stripe?.configured || checkoutLoadingId === item.id}
                      onClick={() => handleCheckout(item)}
                    >
                      {checkoutLoadingId === item.id ? 'Starting...' : 'Unlock with Stripe'}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <AIChatWidget
          studentId={user?._id || 'guest-student'}
          context={{
            page: 'student-premium',
            user: {
              id: user?._id,
              name: user?.name,
              role: user?.role
            }
          }}
          openSignal={chatOpenSignal}
        />
      </main>
    </div>
  );
};

export default StudentPremium;
