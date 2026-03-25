const {
  saveTransaction,
  unlockPremiumContent,
  hasUnlockedContent,
  queueReceiptEmail
} = require('../utils/platformStore');
const Quiz = require('../models/Quiz');
const Stripe = require('stripe');

const premiumCatalog = [
  { id: 'quiz-premium-001', title: 'Advanced OOP Quiz Pack', amount: 9.99, currency: 'USD' },
  { id: 'course-premium-001', title: 'Data Structures Masterclass', amount: 19.99, currency: 'USD' },
  { id: 'kuppi-premium-001', title: 'Kuppi Live: Exam Sprint', amount: 14.99, currency: 'USD' }
];

const findCatalogItem = async (itemId) => {
  const staticItem = premiumCatalog.find((item) => item.id === itemId);
  if (staticItem) return staticItem;

  if (String(itemId).startsWith('quiz-premium-')) {
    const quizId = String(itemId).replace('quiz-premium-', '');
    const quiz = await Quiz.findById(quizId).select('title isPremium premiumPrice premiumCurrency isActive');
    if (!quiz || !quiz.isActive || !quiz.isPremium) return null;

    return {
      id: itemId,
      title: quiz.title,
      amount: Number(quiz.premiumPrice || 0),
      currency: quiz.premiumCurrency || 'USD'
    };
  }

  return null;
};

const getStripeClient = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
};

const completePurchase = async (req, res) => {
  try {
    const {
      studentId,
      email,
      premiumItemId,
      paymentGateway,
      paymentToken,
      billingAddress,
      cardNumber,
      cvv
    } = req.body || {};

    const authenticatedStudentId = req.user?._id ? req.user._id.toString() : null;
    if (authenticatedStudentId && studentId && String(studentId) !== authenticatedStudentId) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to purchase premium content for another user.'
      });
    }

    const requesterStudentId = authenticatedStudentId || studentId;
    const requesterEmail = req.user?.email || email;

    if (!requesterStudentId || !requesterEmail || !premiumItemId || !paymentGateway || !paymentToken) {
      return res.status(400).json({
        success: false,
        message: 'studentId, email, premiumItemId, paymentGateway, and paymentToken are required'
      });
    }

    if (cardNumber || cvv) {
      return res.status(400).json({
        success: false,
        message: 'Do not send raw cardNumber or cvv to this API. Use Stripe/PayPal tokenization.'
      });
    }

    const item = await findCatalogItem(premiumItemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Premium item not found'
      });
    }

    const normalizedGateway = String(paymentGateway).toLowerCase();
    const isSupportedGateway = normalizedGateway === 'stripe' || normalizedGateway === 'paypal';
    if (!isSupportedGateway) {
      return res.status(400).json({
        success: false,
        message: 'paymentGateway must be stripe or paypal'
      });
    }

    const looksTokenized =
      paymentToken.startsWith('tok_') ||
      paymentToken.startsWith('pm_') ||
      paymentToken.startsWith('pi_') ||
      paymentToken.startsWith('PAY-');

    if (!looksTokenized) {
      return res.status(400).json({
        success: false,
        message: 'paymentToken format is invalid. Use gateway-generated token IDs.'
      });
    }

    const transactionId = `txn-${Date.now()}`;
    const transaction = {
      id: transactionId,
      studentId: requesterStudentId,
      email: requesterEmail,
      premiumItemId: item.id,
      itemTitle: item.title,
      amount: item.amount,
      currency: item.currency,
      paymentGateway: normalizedGateway,
      paymentReference: paymentToken,
      billingAddress: billingAddress || {},
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    await saveTransaction(transaction);
    await unlockPremiumContent({ studentId: requesterStudentId, itemId: item.id, title: item.title });
    await queueReceiptEmail({
      studentId: requesterStudentId,
      email: requesterEmail,
      transactionId,
      itemTitle: item.title,
      amount: item.amount
    });

    return res.status(201).json({
      success: true,
      message: 'Payment processed and premium content unlocked',
      data: {
        transactionId,
        item: {
          id: item.id,
          title: item.title
        },
        receipt: {
          email: requesterEmail,
          status: 'queued'
        },
        unlocked: true
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Purchase failed',
      error: error.message
    });
  }
};

const getPremiumCatalog = (req, res) => {
  const fetchCatalog = async () => {
    const premiumQuizzes = await Quiz.find({ isActive: true, isPremium: true })
      .select('_id title premiumPrice premiumCurrency')
      .sort({ createdAt: -1 });

    const quizItems = premiumQuizzes.map((quiz) => ({
      id: `quiz-premium-${quiz._id.toString()}`,
      title: quiz.title,
      amount: Number(quiz.premiumPrice || 0),
      currency: quiz.premiumCurrency || 'USD'
    }));

    return res.json({
      success: true,
      count: premiumCatalog.length + quizItems.length,
      data: [...quizItems, ...premiumCatalog]
    });
  };

  return fetchCatalog().catch((error) => {
    return res.status(500).json({
      success: false,
      message: 'Failed to load premium catalog',
      error: error.message
    });
  });
};

const createStripeCheckoutSession = async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Stripe is not configured. Add STRIPE_SECRET_KEY in backend env.'
      });
    }

    const { premiumItemId, successUrl, cancelUrl } = req.body || {};
    if (!premiumItemId) {
      return res.status(400).json({ success: false, message: 'premiumItemId is required' });
    }

    const item = await findCatalogItem(premiumItemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Premium item not found' });
    }

    const baseClientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const normalizedSuccessUrl = successUrl || `${baseClientUrl}/premium`;
    const normalizedCancelUrl = cancelUrl || `${baseClientUrl}/premium?payment=cancelled`;
    const successRedirect = `${normalizedSuccessUrl}${normalizedSuccessUrl.includes('?') ? '&' : '?'}payment=success&session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: req.user?.email,
      line_items: [
        {
          price_data: {
            currency: String(item.currency || 'USD').toLowerCase(),
            product_data: {
              name: item.title,
              metadata: {
                premiumItemId: item.id
              }
            },
            unit_amount: Math.max(50, Math.round(Number(item.amount || 0) * 100))
          },
          quantity: 1
        }
      ],
      metadata: {
        premiumItemId: item.id,
        studentId: req.user?._id?.toString() || '',
        studentEmail: req.user?.email || ''
      },
      success_url: successRedirect,
      cancel_url: normalizedCancelUrl
    });

    return res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        checkoutUrl: session.url
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create Stripe checkout session', error: error.message });
  }
};

const completeStripeCheckout = async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Stripe is not configured. Add STRIPE_SECRET_KEY in backend env.'
      });
    }

    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Stripe session not found' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Payment is not completed yet' });
    }

    const premiumItemId = session.metadata?.premiumItemId;
    const studentId = req.user?._id?.toString() || session.metadata?.studentId;
    const email = req.user?.email || session.customer_details?.email || session.metadata?.studentEmail;

    if (!premiumItemId || !studentId || !email) {
      return res.status(400).json({ success: false, message: 'Stripe session metadata is incomplete' });
    }

    const item = await findCatalogItem(premiumItemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Premium item not found' });
    }

    const alreadyUnlocked = await hasUnlockedContent({ studentId, itemId: premiumItemId });
    if (alreadyUnlocked) {
      return res.json({
        success: true,
        message: 'Premium content already unlocked',
        data: {
          unlocked: true,
          alreadyUnlocked: true,
          premiumItemId
        }
      });
    }

    const transactionId = `txn-${Date.now()}`;
    const transaction = {
      id: transactionId,
      studentId,
      email,
      premiumItemId,
      itemTitle: item.title,
      amount: Number(item.amount || 0),
      currency: item.currency || 'USD',
      paymentGateway: 'stripe',
      paymentReference: session.id,
      billingAddress: {
        country: session.customer_details?.address?.country || ''
      },
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    await saveTransaction(transaction);
    await unlockPremiumContent({ studentId, itemId: premiumItemId, title: item.title });
    await queueReceiptEmail({
      studentId,
      email,
      transactionId,
      itemTitle: item.title,
      amount: Number(item.amount || 0)
    });

    return res.json({
      success: true,
      message: 'Stripe payment verified and premium content unlocked',
      data: {
        transactionId,
        premiumItemId,
        unlocked: true
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to verify Stripe checkout', error: error.message });
  }
};

module.exports = {
  completePurchase,
  getPremiumCatalog,
  createStripeCheckoutSession,
  completeStripeCheckout
};
