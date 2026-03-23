const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessions,
  getSessionById,
  getTutorSessions,
  updateSession,
  deleteSession,
} = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// /api/sessions
router.get('/', protect, getSessions);
router.post('/', protect, authorize('tutor'), createSession);
router.get('/my-sessions', protect, authorize('tutor'), getTutorSessions);
router.get('/:id', protect, getSessionById);
router.put('/:id', protect, authorize('tutor'), updateSession);
router.delete('/:id', protect, authorize('tutor'), deleteSession);

module.exports = router;
