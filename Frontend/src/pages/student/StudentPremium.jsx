import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import {
  completeStripeCheckout,
  createStripeCheckoutSession,
  getPaymentGatewayStatus,
  getPremiumCatalog
} from '../../services/commerceService';
import './StudentPremium.css';

const StudentPremium = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [catalog, setCatalog] = useState([]);
  const [gateway, setGateway] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [checkoutLoadingId, setCheckoutLoadingId] = useState('');

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');

    if (payment !== 'success' || !sessionId) return;

    const finalize = async () => {
      try {
        await completeStripeCheckout({ sessionId });
        alert('Payment verified and access unlocked.');
      } catch (err) {
        alert(err?.response?.data?.message || 'Failed to verify payment session.');
      } finally {
        navigate('/student/premium', { replace: true });
      }
    };

    finalize();
  }, [location.search, navigate]);

  const normalizedCatalog = useMemo(() => {
    return (catalog || []).map((item) => {
      const type = item.type || (item.id?.startsWith('quiz-')
        ? 'quiz'
        : item.id?.startsWith('course-')
          ? 'course'
          : 'kuppi');

      return { ...item, type };
    });
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    if (typeFilter === 'all') return normalizedCatalog;
    return normalizedCatalog.filter((item) => item.type === typeFilter);
  }, [normalizedCatalog, typeFilter]);

  const typeCounts = useMemo(() => {
    return normalizedCatalog.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      { quiz: 0, course: 0, kuppi: 0 }
    );
  }, [normalizedCatalog]);

  const studentMetrics = useMemo(() => {
    const total = normalizedCatalog.length;
    const cheapest = normalizedCatalog.length
      ? Math.min(...normalizedCatalog.map((item) => Number(item.amount || 0)))
      : 0;
    const avgPrice = normalizedCatalog.length
      ? normalizedCatalog.reduce((sum, item) => sum + Number(item.amount || 0), 0) / normalizedCatalog.length
      : 0;

    return {
      total,
      cheapest,
      avgPrice: Math.round(avgPrice * 100) / 100,
      stripeReady: Boolean(gateway?.stripe?.configured)
    };
  }, [gateway?.stripe?.configured, normalizedCatalog]);

  const handleCheckout = async (item) => {
    try {
      setCheckoutLoadingId(item.id);
      const session = await createStripeCheckoutSession({
        premiumItemId: item.id,
        successUrl: `${window.location.origin}/student/premium`,
        cancelUrl: `${window.location.origin}/student/premium?payment=cancelled`
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

  const navigateToType = (type) => {
    if (type === 'quiz') navigate('/student/quizzes');
    if (type === 'course') navigate('/student/courses');
    if (type === 'kuppi') navigate('/kuppi');
  };

  return (
    <DashboardLayout activeSection="Premium" theme="light">
      <div className="student-premium-page">
        <section className="student-premium-hero">
          <div>
            <h1>Premium Learning Hub</h1>
            <p>Explore premium quizzes, courses, and kuppi sessions with secure payments.</p>
          </div>
          <button onClick={loadPremiumData}>Refresh Catalog</button>
        </section>

        <section className="student-premium-stats">
          <article className="stat-card">
            <span>Total Premium Items</span>
            <strong>{studentMetrics.total}</strong>
          </article>
          <article className="stat-card">
            <span>Starting From</span>
            <strong>{studentMetrics.cheapest.toFixed(2)}</strong>
          </article>
          <article className="stat-card">
            <span>Average Price</span>
            <strong>{studentMetrics.avgPrice.toFixed(2)}</strong>
          </article>
          <article className="stat-card">
            <span>Gateway</span>
            <strong>{studentMetrics.stripeReady ? 'Stripe Ready' : 'Pending Setup'}</strong>
          </article>
        </section>

        <section className="student-premium-toolbar">
          <div className="type-tabs">
            <button className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>
              All ({normalizedCatalog.length})
            </button>
            <button className={typeFilter === 'quiz' ? 'active' : ''} onClick={() => setTypeFilter('quiz')}>
              Quizzes ({typeCounts.quiz})
            </button>
            <button className={typeFilter === 'course' ? 'active' : ''} onClick={() => setTypeFilter('course')}>
              Courses ({typeCounts.course})
            </button>
            <button className={typeFilter === 'kuppi' ? 'active' : ''} onClick={() => setTypeFilter('kuppi')}>
              Kuppi ({typeCounts.kuppi})
            </button>
          </div>
        </section>

        {loading ? (
          <div className="state-box">Loading premium catalog...</div>
        ) : error ? (
          <div className="state-box error">{error}</div>
        ) : filteredCatalog.length === 0 ? (
          <div className="state-box">No premium items found in this category.</div>
        ) : (
          <section className="student-premium-grid">
            {filteredCatalog.map((item) => (
              <article key={item.id} className="premium-card">
                <div className="premium-top">
                  <span className={`premium-type ${item.type}`}>{item.type}</span>
                  <small>{item.id}</small>
                </div>

                <h3>{item.title}</h3>
                <p className="price">
                  {(item.currency || 'USD').toUpperCase()} {Number(item.amount || 0).toFixed(2)}
                </p>

                <div className="card-actions">
                  <button
                    disabled={!gateway?.stripe?.configured || checkoutLoadingId === item.id}
                    onClick={() => handleCheckout(item)}
                  >
                    {checkoutLoadingId === item.id ? 'Starting...' : 'Unlock with Stripe'}
                  </button>
                  <button className="ghost" onClick={() => navigateToType(item.type)}>
                    View Related Content
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentPremium;
