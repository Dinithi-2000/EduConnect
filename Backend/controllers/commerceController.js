const {
  saveTransaction,
  unlockPremiumContent,
  hasUnlockedContent,
  queueReceiptEmail
} = require('../utils/platformStore');
const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const Session = require('../models/Session');
const PaymentTransaction = require('../models/PaymentTransaction');
const Stripe = require('stripe');

const findCatalogItem = async (itemId) => {
  if (String(itemId).startsWith('quiz-premium-')) {
    const quizId = String(itemId).replace('quiz-premium-', '');
    const quiz = await Quiz.findById(quizId).select('title subject isPremium premiumPrice premiumCurrency isActive');
    if (!quiz || !quiz.isActive || !quiz.isPremium) return null;

    return {
      id: itemId,
      type: 'quiz',
      title: quiz.title,
      subtitle: quiz.subject || '',
      amount: Number(quiz.premiumPrice || 0),
      currency: quiz.premiumCurrency || 'USD',
      imageUrl: ''
    };
  }

  if (String(itemId).startsWith('course-premium-')) {
    const courseId = String(itemId).replace('course-premium-', '');
    const course = await Course.findById(courseId).select('title subject description thumbnailUrl isPremium premiumPrice premiumCurrency isPublished');
    if (!course || !course.isPublished || !course.isPremium) return null;

    return {
      id: itemId,
      type: 'course',
      title: course.title,
      subtitle: course.subject || course.description || '',
      amount: Number(course.premiumPrice || 0),
      currency: course.premiumCurrency || 'USD',
      imageUrl: course.thumbnailUrl || ''
    };
  }

  if (String(itemId).startsWith('kuppi-premium-')) {
    const sessionId = String(itemId).replace('kuppi-premium-', '');
    const session = await Session.findById(sessionId).select('title subject description isPremium premiumPrice premiumCurrency status');
    if (!session || !session.isPremium || session.status === 'cancelled') return null;

    return {
      id: itemId,
      type: 'kuppi',
      title: session.title,
      subtitle: session.subject || session.description || '',
      amount: Number(session.premiumPrice || 0),
      currency: session.premiumCurrency || 'USD',
      imageUrl: ''
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

const getPremiumCatalog = async (req, res) => {
  try {
    const premiumQuizzes = await Quiz.find({ isActive: true, isPremium: true })
      .select('_id title subject premiumPrice premiumCurrency')
      .sort({ createdAt: -1 });

    const premiumCourses = await Course.find({ isPublished: true, isPremium: true })
      .select('_id title subject description thumbnailUrl premiumPrice premiumCurrency')
      .sort({ createdAt: -1 });

    const premiumKuppiSessions = await Session.find({ isPremium: true, status: { $ne: 'cancelled' } })
      .select('_id title subject description premiumPrice premiumCurrency')
      .sort({ createdAt: -1 });

    const quizItems = premiumQuizzes.map((quiz) => ({
      id: `quiz-premium-${quiz._id.toString()}`,
      type: 'quiz',
      title: quiz.title,
      subtitle: quiz.subject || '',
      amount: Number(quiz.premiumPrice || 0),
      currency: quiz.premiumCurrency || 'USD',
      imageUrl: ''
    }));

    const courseItems = premiumCourses.map((course) => ({
      id: `course-premium-${course._id.toString()}`,
      type: 'course',
      title: course.title,
      subtitle: course.subject || course.description || '',
      amount: Number(course.premiumPrice || 0),
      currency: course.premiumCurrency || 'USD',
      imageUrl: course.thumbnailUrl || ''
    }));

    const kuppiItems = premiumKuppiSessions.map((session) => ({
      id: `kuppi-premium-${session._id.toString()}`,
      type: 'kuppi',
      title: session.title,
      subtitle: session.subject || session.description || '',
      amount: Number(session.premiumPrice || 0),
      currency: session.premiumCurrency || 'USD',
      imageUrl: ''
    }));

    const allItems = [...quizItems, ...courseItems, ...kuppiItems];
    const studentId = req.user?._id ? req.user._id.toString() : null;

    const data = await Promise.all(
      allItems.map(async (item) => {
        const hasAccess = studentId
          ? await hasUnlockedContent({ studentId, itemId: item.id })
          : false;

        return {
          ...item,
          hasAccess
        };
      })
    );

    return res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load premium catalog',
      error: error.message
    });
  }
};

const getRecentTransactions = async (req, res) => {
  try {
    const isPrivileged = ['admin', 'teacher'].includes(req.user?.role);
    const query = isPrivileged ? {} : { studentId: req.user?._id?.toString() || '' };

    const transactions = await PaymentTransaction.find(query)
      .select('id itemTitle email createdAt amount currency status paymentGateway')
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    return res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load recent transactions',
      error: error.message
    });
  }
};

const getPaymentGatewayStatus = (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const stripeConfigured = Boolean(stripeKey);
  const stripeMode = stripeKey.startsWith('sk_live_') ? 'live' : stripeConfigured ? 'test' : 'not-configured';

  return res.json({
    success: true,
    data: {
      stripe: {
        configured: stripeConfigured,
        mode: stripeMode
      },
      supportedGateways: ['stripe', 'paypal'],
      defaultGateway: 'stripe'
    }
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
  getPaymentGatewayStatus,
  getRecentTransactions,
  createStripeCheckoutSession,
  completeStripeCheckout
};
