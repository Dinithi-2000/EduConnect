const {
  saveTransaction,
  unlockPremiumContent,
  queueReceiptEmail
} = require('../utils/platformStore');

const premiumCatalog = [
  { id: 'quiz-premium-001', title: 'Advanced OOP Quiz Pack', amount: 9.99, currency: 'USD' },
  { id: 'course-premium-001', title: 'Data Structures Masterclass', amount: 19.99, currency: 'USD' },
  { id: 'kuppi-premium-001', title: 'Kuppi Live: Exam Sprint', amount: 14.99, currency: 'USD' }
];

const findCatalogItem = (itemId) => {
  return premiumCatalog.find((item) => item.id === itemId);
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

    if (!studentId || !email || !premiumItemId || !paymentGateway || !paymentToken) {
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

    const item = findCatalogItem(premiumItemId);
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
      studentId,
      email,
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
    await unlockPremiumContent({ studentId, itemId: item.id, title: item.title });
    await queueReceiptEmail({
      studentId,
      email,
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
          email,
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
  return res.json({
    success: true,
    count: premiumCatalog.length,
    data: premiumCatalog
  });
};

module.exports = {
  completePurchase,
  getPremiumCatalog
};
