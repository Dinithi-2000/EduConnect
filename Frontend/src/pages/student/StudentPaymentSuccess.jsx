import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { completeStripeCheckout } from '../../services/commerceService';
import './StudentPaymentSuccess.css';

const StudentPaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Verifying your Stripe payment...');
  const [premiumItemId, setPremiumItemId] = useState('');

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const source = params.get('source') || 'premium';

  useEffect(() => {
    const payment = params.get('payment');
    const sessionId = params.get('session_id');

    if (payment === 'cancelled') {
      setStatus('cancelled');
      setMessage('Payment was cancelled. You can continue when you are ready.');
      return;
    }

    if (payment !== 'success' || !sessionId) {
      setStatus('failed');
      setMessage('Invalid payment return URL. Please try checkout again.');
      return;
    }

    const verify = async () => {
      try {
        const response = await completeStripeCheckout({ sessionId });
        const itemId = response?.data?.premiumItemId || response?.data?.data?.premiumItemId || '';
        setPremiumItemId(itemId);
        setStatus('success');
        setMessage('Payment successful. Your premium content is now unlocked.');
      } catch (error) {
        setStatus('failed');
        setMessage(error?.response?.data?.message || 'Payment verification failed. Please contact support if you were charged.');
      }
    };

    verify();
  }, [params]);

  const primaryRoute = source === 'quizzes' ? '/student/quizzes' : '/student/premium';
  const primaryLabel = source === 'quizzes' ? 'Back to Quizzes' : 'Back to Premium';

  return (
    <DashboardLayout activeSection="Premium" theme="light">
      <div className="student-payment-page">
        <section className={`payment-card ${status}`}>
          <div className="payment-icon" aria-hidden="true">
            {status === 'processing' && '⟳'}
            {status === 'success' && '✓'}
            {status === 'cancelled' && '!'}
            {status === 'failed' && '⚠'}
          </div>

          <h1>
            {status === 'processing' && 'Processing Payment'}
            {status === 'success' && 'Payment Successful'}
            {status === 'cancelled' && 'Payment Cancelled'}
            {status === 'failed' && 'Payment Verification Failed'}
          </h1>

          <p>{message}</p>
          {premiumItemId && <small>Unlocked Item: {premiumItemId}</small>}

          <div className="payment-actions">
            <button type="button" onClick={() => navigate(primaryRoute)}>{primaryLabel}</button>
            <button type="button" className="ghost" onClick={() => navigate('/student/courses')}>
              Open Course & Contents
            </button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default StudentPaymentSuccess;
