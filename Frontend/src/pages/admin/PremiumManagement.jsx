import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  completeStripeCheckout,
  createStripeCheckoutSession,
  getPaymentGatewayStatus,
  getPremiumCatalog
} from '../../services/commerceService';
import './PremiumManagement.css';

const PremiumManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdminView = ['admin', 'teacher'].includes(user?.role);

  const [catalog, setCatalog] = useState([]);
  const [gateway, setGateway] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [checkoutLoadingId, setCheckoutLoadingId] = useState('');
  const [verifyingCheckout, setVerifyingCheckout] = useState(false);

  const loadData = useCallback(async () => {
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
      setError(err.response?.data?.message || 'Failed to load premium management data.');
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

    if (payment !== 'success' || !sessionId) return;

    const finalizeCheckout = async () => {
      try {
        setVerifyingCheckout(true);
        await completeStripeCheckout({ sessionId });
        alert('Stripe checkout verified and premium access updated.');
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to verify Stripe checkout session.');
      } finally {
        setVerifyingCheckout(false);
        navigate('/premium-management', { replace: true });
      }
    };

    finalizeCheckout();
  }, [location.search, navigate]);

  const normalizedCatalog = useMemo(() => {
    return (catalog || []).map((item) => {
      const type = item.type || (item.id?.startsWith('quiz-') ? 'quiz' : item.id?.startsWith('course-') ? 'course' : 'kuppi');
      return {
        ...item,
        type
      };
    });
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    if (activeType === 'all') return normalizedCatalog;
    return normalizedCatalog.filter((item) => item.type === activeType);
  }, [normalizedCatalog, activeType]);

  const typeCounts = useMemo(() => {
    return normalizedCatalog.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      { quiz: 0, course: 0, kuppi: 0 }
    );
  }, [normalizedCatalog]);

  const handleTestCheckout = async (item) => {
    setCheckoutLoadingId(item.id);
    try {
      const session = await createStripeCheckoutSession({
        premiumItemId: item.id,
        successUrl: `${window.location.origin}/premium-management`,
        cancelUrl: `${window.location.origin}/premium-management?payment=cancelled`
      });

      const checkoutUrl = session?.data?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error('Checkout URL was not returned by the server.');
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to create Stripe checkout session.');
      setCheckoutLoadingId('');
    }
  };

  if (!isAdminView) {
    return (
      <DashboardLayout activeSection="Premium">
        <div className="premium-management-page">
          <div className="premium-empty-state">
            <h2>Premium management is restricted to admin users.</h2>
            <button onClick={() => navigate('/premium')}>Open Premium Store</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeSection="Premium & Payments">
      <div className="premium-management-page">
        <section className="premium-management-hero">
          <div>
            <h1>Premium Monetization & Payment Gateway</h1>
            <p>Manage paid quizzes, courses, and kuppi sessions with Stripe checkout support.</p>
          </div>
          <button onClick={loadData}>Refresh Data</button>
        </section>

        {verifyingCheckout && <div className="premium-banner">Verifying checkout session...</div>}

        {loading ? (
          <div className="premium-loading">Loading premium management data...</div>
        ) : error ? (
          <div className="premium-error-block">
            <p>{error}</p>
            <button onClick={loadData}>Retry</button>
          </div>
        ) : (
          <>
            <section className="gateway-grid">
              <article className="gateway-card">
                <h3>Stripe</h3>
                <p className={`gateway-status ${gateway?.stripe?.configured ? 'up' : 'down'}`}>
                  {gateway?.stripe?.configured ? `Configured (${gateway?.stripe?.mode})` : 'Not configured'}
                </p>
                <small>Set STRIPE_SECRET_KEY in backend env for live checkout sessions.</small>
              </article>

              <article className="gateway-card">
                <h3>Supported Gateways</h3>
                <p>{(gateway?.supportedGateways || []).join(', ') || 'stripe'}</p>
                <small>Default: {gateway?.defaultGateway || 'stripe'}</small>
              </article>

              <article className="gateway-card gateway-actions">
                <h3>Management Links</h3>
                <div>
                  <button onClick={() => navigate('/quizzes')}>Manage Quizzes</button>
                  <button onClick={() => navigate('/courses')}>Manage Courses</button>
                  <button onClick={() => navigate('/kuppi')}>Manage Kuppi Sessions</button>
                </div>
              </article>
            </section>

            <section className="premium-toolbar">
              <div className="type-tabs">
                <button className={activeType === 'all' ? 'active' : ''} onClick={() => setActiveType('all')}>
                  All ({normalizedCatalog.length})
                </button>
                <button className={activeType === 'quiz' ? 'active' : ''} onClick={() => setActiveType('quiz')}>
                  Premium Quizzes ({typeCounts.quiz})
                </button>
                <button className={activeType === 'course' ? 'active' : ''} onClick={() => setActiveType('course')}>
                  Premium Courses ({typeCounts.course})
                </button>
                <button className={activeType === 'kuppi' ? 'active' : ''} onClick={() => setActiveType('kuppi')}>
                  Premium Kuppi Sessions ({typeCounts.kuppi})
                </button>
              </div>
            </section>

            {filteredCatalog.length === 0 ? (
              <div className="premium-empty-state">
                <h2>No premium items found for this category.</h2>
              </div>
            ) : (
              <section className="catalog-grid">
                {filteredCatalog.map((item) => (
                  <article key={item.id} className="catalog-card">
                    <div className="catalog-top">
                      <span className={`catalog-type ${item.type}`}>{item.type}</span>
                      <span className="catalog-id">{item.id}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p className="catalog-price">
                      {(item.currency || 'USD').toUpperCase()} {Number(item.amount || 0).toFixed(2)}
                    </p>

                    <div className="catalog-actions">
                      <button
                        disabled={!gateway?.stripe?.configured || checkoutLoadingId === item.id}
                        onClick={() => handleTestCheckout(item)}
                      >
                        {checkoutLoadingId === item.id ? 'Starting...' : 'Test Stripe Checkout'}
                      </button>

                      {item.type === 'quiz' && <button onClick={() => navigate('/quizzes')}>Open Quiz Management</button>}
                      {item.type === 'course' && <button onClick={() => navigate('/courses')}>Open Course Management</button>}
                      {item.type === 'kuppi' && <button onClick={() => navigate('/kuppi')}>Open Kuppi Management</button>}
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PremiumManagement;
