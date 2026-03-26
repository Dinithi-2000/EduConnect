const express = require('express');
const {
	completePurchase,
	getPremiumCatalog,
	getPaymentGatewayStatus,
	createStripeCheckoutSession,
	completeStripeCheckout
} = require('../controllers/commerceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/premium-catalog', getPremiumCatalog);
router.get('/payment-gateways', protect, getPaymentGatewayStatus);
router.post('/complete-purchase', protect, completePurchase);
router.post('/stripe/create-checkout-session', protect, createStripeCheckoutSession);
router.post('/stripe/complete-checkout', protect, completeStripeCheckout);

module.exports = router;
