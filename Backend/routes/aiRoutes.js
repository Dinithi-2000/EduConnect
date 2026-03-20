const express = require('express');
const { askAI } = require('../controllers/aiController');

const router = express.Router();

router.post('/chat', askAI);

module.exports = router;
