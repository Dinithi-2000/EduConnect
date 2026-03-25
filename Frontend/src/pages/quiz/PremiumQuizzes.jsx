import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import {
  completeStripeCheckout,
  createStripeCheckoutSession,
  getPremiumQuizzes
} from '../../services/quizService';
import './PremiumQuizzes.css';

const PremiumQuizzes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchasingId, setPurchasingId] = useState('');
  const [verifyingCheckout, setVerifyingCheckout] = useState(false);

  const loadPremium = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getPremiumQuizzes();
      setQuizzes(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load premium quizzes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPremium();
  }, [loadPremium]);

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
        alert('Stripe payment verified. Premium quiz unlocked successfully.');
        await loadPremium();
      } catch (err) {
        alert(err.response?.data?.message || 'Payment verification failed. Contact support if you were charged.');
      } finally {
        setVerifyingCheckout(false);
        navigate('/premium', { replace: true });
      }
    };

    finalizeStripeCheckout();
  }, [location.search, loadPremium, navigate]);

  const handlePurchase = async (quiz) => {
    const confirmPay = window.confirm(
      `Unlock ${quiz.title} for ${quiz.premiumCurrency || 'USD'} ${Number(quiz.premiumPrice || 0).toFixed(2)}?`
    );
    if (!confirmPay) return;

    setPurchasingId(quiz._id);
    try {
      const sessionPayload = {
        premiumItemId: quiz.premiumItemId,
        successUrl: `${window.location.origin}/premium`,
        cancelUrl: `${window.location.origin}/premium?payment=cancelled`
      };

      const session = await createStripeCheckoutSession(sessionPayload);
      const checkoutUrl = session?.data?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error('Stripe checkout URL was not returned by the server.');
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      alert(err.response?.data?.message || 'Payment failed. Please try again.');
      setPurchasingId('');
      return;
    } finally {
      // Keep loading state only until redirect starts.
    }
  };

  return (
    <DashboardLayout activeSection="Premium">
      <div className="premium-page">
        <div className="premium-hero">
          <div>
            <h1>Premium Quiz Vault</h1>
            <p>Access advanced quizzes with secure Stripe Checkout and instant unlock.</p>
          </div>
          <button className="refresh-btn" onClick={loadPremium}>Refresh</button>
        </div>

        {verifyingCheckout && (
          <div className="premium-verifying">Verifying Stripe payment and unlocking your quiz...</div>
        )}

        {loading ? (
          <div className="premium-loading">Loading premium quizzes...</div>
        ) : error ? (
          <div className="premium-error">
            <p>{error}</p>
            <button onClick={loadPremium}>Retry</button>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="premium-empty">
            <h3>No premium quizzes yet</h3>
            <p>Admins can mark quizzes as premium in the quiz builder.</p>
          </div>
        ) : (
          <div className="premium-grid">
            {quizzes.map((quiz) => {
              const price = `${quiz.premiumCurrency || 'USD'} ${Number(quiz.premiumPrice || 0).toFixed(2)}`;
              return (
                <div key={quiz._id} className="premium-card">
                  <div className="premium-card-top">
                    <span className="premium-badge">Premium</span>
                    <span className="premium-subject">{quiz.subject}</span>
                  </div>

                  <h3>{quiz.title}</h3>
                  <p>{quiz.description || 'Advanced premium assessment for focused practice.'}</p>

                  <div className="premium-meta">
                    <span>{quiz.questions?.length || 0} Questions</span>
                    <span>{quiz.timeLimit} min</span>
                    <span>{quiz.totalMarks} marks</span>
                  </div>

                  <div className="premium-footer">
                    <div className="premium-price">{price}</div>
                    {quiz.hasAccess ? (
                      <button className="premium-action unlocked" onClick={() => navigate(`/quizzes/${quiz._id}/attempt`)}>
                        Start Quiz
                      </button>
                    ) : (
                      <button
                        className="premium-action"
                        onClick={() => handlePurchase(quiz)}
                        disabled={purchasingId === quiz._id}
                      >
                        {purchasingId === quiz._id ? 'Processing...' : 'Unlock Now'}
                      </button>
                    )}
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

export default PremiumQuizzes;
