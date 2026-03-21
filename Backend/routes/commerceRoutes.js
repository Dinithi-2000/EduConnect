const express = require('express');
const { completePurchase, getPremiumCatalog } = require('../controllers/commerceController');

const router = express.Router();

router.get('/premium-catalog', getPremiumCatalog);
router.post('/complete-purchase', completePurchase);

module.exports = router;
