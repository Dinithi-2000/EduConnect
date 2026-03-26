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

router.get('/', protect, getSessions);
router.post('/', protect, authorize('tutor', 'teacher', 'admin'), createSession);
router.get('/my-sessions', protect, authorize('tutor', 'teacher', 'admin'), getTutorSessions);
router.get('/:id', protect, getSessionById);
router.put('/:id', protect, authorize('tutor', 'teacher', 'admin'), updateSession);
router.delete('/:id', protect, authorize('tutor', 'teacher', 'admin'), deleteSession);

module.exports = router;
