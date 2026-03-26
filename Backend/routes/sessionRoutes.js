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
const sessionMaterialUpload = require('../middleware/sessionMaterialUpload');

router.get('/', protect, getSessions);
router.post('/', protect, authorize('tutor', 'teacher'), sessionMaterialUpload.single('lectureMaterial'), createSession);
router.get('/my-sessions', protect, authorize('tutor', 'teacher'), getTutorSessions);
router.get('/:id', protect, getSessionById);
router.put('/:id', protect, authorize('tutor', 'teacher'), updateSession);
router.delete('/:id', protect, authorize('tutor', 'teacher'), deleteSession);

module.exports = router;
