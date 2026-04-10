import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  completeStripeCheckout,
  createStripeCheckoutSession,
  getPaymentGatewayStatus,
  getPremiumCatalog,
  getRecentTransactions
} from '../../services/commerceService';
import quizPremiumImage from '../../assets/payment/quiz-premium.svg';
import coursePremiumImage from '../../assets/payment/course-premium.svg';
import kuppiPremiumImage from '../../assets/payment/kuppi-premium.svg';
import './PremiumManagement.css';

const PremiumManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdminView = ['admin', 'teacher'].includes(user?.role);

  const [catalog, setCatalog] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [gateway, setGateway] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [checkoutLoadingId, setCheckoutLoadingId] = useState('');
  const [verifyingCheckout, setVerifyingCheckout] = useState(false);
  const [statusNote, setStatusNote] = useState({ type: '', text: '' });
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const includeDemoData = true;

  const imageByType = useMemo(
    () => ({
      quiz: quizPremiumImage,
      course: coursePremiumImage,
      kuppi: kuppiPremiumImage
    }),
    []
  );

  const demoCatalog = useMemo(
    () => [
      {
        id: 'course-premium-demo-001',
        type: 'course',
        title: 'English for Academic Purposes',
        subtitle: 'Advanced techniques for research writing, peer review, and citation strategy.',
        amount: 300,
        currency: 'LKR',
        hasAccess: true,
        imageUrl: coursePremiumImage
      },
      {
        id: 'quiz-premium-demo-002',
        type: 'quiz',
        title: 'Advanced SEO Strategies',
        subtitle: 'Master technical SEO, schema markup, and modern ranking optimization.',
        amount: 150,
        currency: 'LKR',
        hasAccess: true,
        imageUrl: quizPremiumImage
      },
      {
        id: 'kuppi-premium-demo-003',
        type: 'kuppi',
        title: '1:1 Career Mentorship',
        subtitle: 'Private mentorship and interview preparation with industry experts.',
        amount: 1200,
        currency: 'LKR',
        hasAccess: false,
        imageUrl: kuppiPremiumImage
      }
    ],
    []
  );

  const demoTransactions = useMemo(
    () => [
      {
        id: 'TRX-99201',
        itemTitle: 'English for Academic Purposes',
        email: 'dilshan.p@example.lk',
        createdAt: '2023-10-24T08:30:00.000Z',
        amount: 300,
        currency: 'LKR',
        status: 'completed',
        paymentGateway: 'stripe'
      },
      {
        id: 'TRX-99198',
        itemTitle: 'Advanced SEO Strategies',
        email: 'sarah.w@cloud.io',
        createdAt: '2023-10-23T11:15:00.000Z',
        amount: 150,
        currency: 'LKR',
        status: 'completed',
        paymentGateway: 'stripe'
      },
      {
        id: 'TRX-99195',
        itemTitle: '1:1 Career Mentorship',
        email: 'kasun.m@dev.lk',
        createdAt: '2023-10-23T06:00:00.000Z',
        amount: 1200,
        currency: 'LKR',
        status: 'failed',
        paymentGateway: 'stripe'
      }
    ],
    []
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [catalogRes, gatewayRes, transactionsRes] = await Promise.all([
        getPremiumCatalog(),
        getPaymentGatewayStatus(),
        getRecentTransactions()
      ]);

      setCatalog(catalogRes?.data || []);
      setGateway(gatewayRes?.data || null);
      setTransactions(transactionsRes?.data || []);
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
        setStatusNote({ type: 'success', text: 'Checkout verified. Premium access has been updated.' });
      } catch (err) {
        setStatusNote({ type: 'error', text: err.response?.data?.message || 'Failed to verify Stripe checkout session.' });
      } finally {
        setVerifyingCheckout(false);
        navigate('/premium-management', { replace: true });
      }
    };

    finalizeCheckout();
  }, [location.search, navigate]);

  useEffect(() => {
    if (!showAddItemModal) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowAddItemModal(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showAddItemModal]);

  const normalizedCatalog = useMemo(() => {
    const liveCatalog = catalog || [];
    const sourceCatalog = includeDemoData ? [...liveCatalog, ...demoCatalog] : liveCatalog;

    return sourceCatalog.map((item) => {
      const type = item.type || (item.id?.startsWith('quiz-') ? 'quiz' : item.id?.startsWith('course-') ? 'course' : 'kuppi');
      return {
        ...item,
        type,
        imageUrl: item.imageUrl || imageByType[type] || quizPremiumImage
      };
    });
  }, [catalog, demoCatalog, imageByType, includeDemoData]);

  const activityTransactions = useMemo(() => {
    const liveTransactions = transactions || [];
    return includeDemoData ? [...liveTransactions, ...demoTransactions] : liveTransactions;
  }, [transactions, demoTransactions, includeDemoData]);

  const filteredCatalog = useMemo(() => {
    if (activeType === 'all') return normalizedCatalog;
    return normalizedCatalog.filter((item) => item.type === activeType);
  }, [normalizedCatalog, activeType]);

  const visibleCatalog = useMemo(() => {
    const query = String(searchText || '').trim().toLowerCase();
    if (!query) return filteredCatalog;

    return filteredCatalog.filter((item) => {
      return String(item.title || '').toLowerCase().includes(query)
        || String(item.id || '').toLowerCase().includes(query)
        || String(item.type || '').toLowerCase().includes(query);
    });
  }, [filteredCatalog, searchText]);

  const sortedCatalog = useMemo(() => {
    const cloned = [...visibleCatalog];

    if (sortBy === 'price-high') {
      return cloned.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    }

    if (sortBy === 'price-low') {
      return cloned.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
    }

    if (sortBy === 'title') {
      return cloned.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    }

    return cloned;
  }, [visibleCatalog, sortBy]);

  const typeCounts = useMemo(() => {
    return normalizedCatalog.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      { quiz: 0, course: 0, kuppi: 0 }
    );
  }, [normalizedCatalog]);

  const revenueSummary = useMemo(() => {
    const totals = normalizedCatalog.reduce((acc, item) => {
      const currency = String(item.currency || 'USD').toUpperCase();
      const amount = Number(item.amount || 0);
      acc[currency] = (acc[currency] || 0) + amount;
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`)
      .join(' • ') || 'No priced items';
  }, [normalizedCatalog]);

  const accessibleCount = useMemo(() => normalizedCatalog.filter((item) => item.hasAccess).length, [normalizedCatalog]);

  const totalCatalogValue = useMemo(
    () => normalizedCatalog.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [normalizedCatalog]
  );

  const totalTransactionValue = useMemo(
    () => (activityTransactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    [activityTransactions]
  );

  const resolvedCurrency = useMemo(() => {
    return String(normalizedCatalog[0]?.currency || activityTransactions[0]?.currency || 'USD').toUpperCase();
  }, [normalizedCatalog, activityTransactions]);

  const exportTransactionsCsv = () => {
    const rows = [
      ['Transaction ID', 'Item Name', 'Customer', 'Date', 'Amount', 'Currency', 'Status', 'Gateway'].join(',')
    ];

    (activityTransactions || []).forEach((tx) => {
      const line = [
        tx.id || '',
        `"${String(tx.itemTitle || '').replace(/"/g, '""')}"`,
        `"${String(tx.email || '').replace(/"/g, '""')}"`,
        tx.createdAt ? new Date(tx.createdAt).toISOString() : '',
        Number(tx.amount || 0).toFixed(2),
        String(tx.currency || 'USD').toUpperCase(),
        String(tx.status || ''),
        String(tx.paymentGateway || '')
      ].join(',');

      rows.push(line);
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `premium-transactions-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleAddItemNavigation = (targetRoute) => {
    setShowAddItemModal(false);
    navigate(targetRoute);
  };

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
      setStatusNote({ type: 'error', text: err.response?.data?.message || 'Unable to create Stripe checkout session.' });
      setCheckoutLoadingId('');
    }
  };

  const formatCatalogId = (itemId) => {
    const raw = String(itemId || '');
    if (!raw) return 'N/A';
    const segments = raw.split('-');
    const last = segments[segments.length - 1] || raw;
    return last.length > 16 ? `${last.slice(0, 8)}...${last.slice(-4)}` : last;
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
    <DashboardLayout activeSection="Premium & Payment Management">
      <div className="premium-management-page structured-premium-page">
        <section className="premium-management-hero modern-hero structured-header">
          <div className="hero-copy">
            <p className="hero-eyebrow">Commerce Console</p>
            <h1>Premium Payment Management</h1>
            <p>Manage monetized quizzes, courses, and sessions.</p>
          </div>
          <div className="hero-actions">
            <button onClick={loadData}>Refresh Data</button>
          </div>
        </section>

        {verifyingCheckout && <div className="premium-banner">Verifying checkout session...</div>}
        {statusNote?.text && <div className={`premium-inline-note ${statusNote.type}`}>{statusNote.text}</div>}

        {loading ? (
          <div className="premium-loading">Loading premium management data...</div>
        ) : error ? (
          <div className="premium-error-block">
            <p>{error}</p>
            <button onClick={loadData}>Retry</button>
          </div>
        ) : (
          <>
            <section className="premium-insights-grid">
              <article className="premium-insight-card">
                <span>Total Premium Items</span>
                <strong>{normalizedCatalog.length}</strong>
                <small>{resolvedCurrency} {totalTransactionValue.toFixed(2)} in recent checkout activity.</small>
              </article>
              <article className="premium-insight-card">
                <span>Checkout Status</span>
                <strong>{gateway?.stripe?.configured ? `ONLINE (${String(gateway?.stripe?.mode || 'test').toUpperCase()})` : 'OFFLINE'}</strong>
                <small>{gateway?.stripe?.configured ? 'Stripe checkout available' : 'Stripe not configured in backend env'}</small>
              </article>
              <article className="premium-insight-card">
                <span>Catalog Value</span>
                <strong>{resolvedCurrency} {totalCatalogValue.toFixed(2)}</strong>
                <small>{revenueSummary} | {accessibleCount} items unlocked in your account.</small>
              </article>
            </section>

            <section className="premium-toolbar modern-toolbar">
              <div className="premium-toolbar-top">
                <div className="premium-toolbar-filters">
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
                </div>
                <div className="premium-toolbar-controls">
                  <input
                    className="premium-search"
                    placeholder="Search premium items, transactions, or logs..."
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                  />
                  <select className="premium-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="latest">Sort: Latest</option>
                    <option value="price-high">Sort: Price High to Low</option>
                    <option value="price-low">Sort: Price Low to High</option>
                    <option value="title">Sort: Title A-Z</option>
                  </select>
                  <button className="btn-add-item" onClick={() => setShowAddItemModal(true)}>
                    Add New Item
                  </button>
                </div>
              </div>
              <small className="premium-toolbar-meta">Showing {sortedCatalog.length} item(s) {includeDemoData ? '(includes demo data)' : ''}</small>
            </section>

            {sortedCatalog.length === 0 ? (
              <div className="premium-empty-state">
                <h2>No premium items found for this category.</h2>
              </div>
            ) : (
              <section className="catalog-grid">
                {sortedCatalog.map((item) => (
                  <article key={item.id} className="catalog-card">
                    <div className="catalog-image-wrap">
                      <img
                        src={item.imageUrl}
                        alt={`${item.type} premium`}
                        className="catalog-image"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = imageByType[item.type] || quizPremiumImage;
                        }}
                      />
                    </div>
                    <div className="catalog-top">
                      <span className={`catalog-type ${item.type}`}>{item.type}</span>
                      <span className="catalog-id" title={item.id}>{formatCatalogId(item.id)}</span>
                    </div>
                    <h3 title={item.title}>{item.title}</h3>
                    <p className="catalog-subtitle">{item.subtitle || 'Premium item ready for checkout'}</p>
                    <p className="catalog-price">
                      {(item.currency || 'USD').toUpperCase()} {Number(item.amount || 0).toFixed(2)}
                    </p>
                    <p className="catalog-meta">
                      Access: <strong>{item.hasAccess ? 'Unlocked' : 'Locked'}</strong>
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
                      {item.type === 'kuppi' && <button onClick={() => navigate('/sessions')}>Open Kuppi Management</button>}
                    </div>
                  </article>
                ))}
              </section>
            )}

            <section className="payment-activity-section">
              <div className="activity-head">
                <h2>Recent Checkout Activity</h2>
                <button onClick={exportTransactionsCsv}>Export Ledger (CSV)</button>
              </div>

              {activityTransactions.length === 0 ? (
                <div className="premium-empty-state">
                  <h2>No checkout activity yet.</h2>
                </div>
              ) : (
                <div className="activity-table-wrap">
                  <table className="activity-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Item Name</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityTransactions.map((tx) => (
                        <tr key={tx.id}>
                          <td>#{tx.id}</td>
                          <td>{tx.itemTitle}</td>
                          <td>{tx.email}</td>
                          <td>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '-'}</td>
                          <td>
                            {String(tx.currency || 'USD').toUpperCase()} {Number(tx.amount || 0).toFixed(2)}
                          </td>
                          <td>
                            <span className={`tx-status ${String(tx.status || '').toLowerCase() === 'completed' ? 'success' : 'failed'}`}>
                              {String(tx.status || 'unknown').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {showAddItemModal && (
          <div className="add-item-modal-overlay" onClick={() => setShowAddItemModal(false)}>
            <div className="add-item-modal" role="dialog" aria-modal="true" aria-label="Choose item type" onClick={(event) => event.stopPropagation()}>
              <h3>Add Premium Item</h3>
              <p>Choose where you want to create a new premium item.</p>
              <div className="add-item-options">
                <button onClick={() => handleAddItemNavigation('/quizzes')}>
                  <span>Quiz</span>
                  <small>Create premium quizzes</small>
                </button>
                <button onClick={() => handleAddItemNavigation('/courses')}>
                  <span>Course</span>
                  <small>Create premium courses</small>
                </button>
                <button onClick={() => handleAddItemNavigation('/sessions')}>
                  <span>Session</span>
                  <small>Create premium kuppi sessions</small>
                </button>
              </div>
              <button className="add-item-cancel" onClick={() => setShowAddItemModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PremiumManagement;
