const express = require('express');
const { askAI, trainKnowledge, getStudentHistory } = require('../controllers/aiController');

const router = express.Router();

router.post('/chat', askAI);
router.post('/train', trainKnowledge);
router.get('/history/:studentId', getStudentHistory);

module.exports = router;
