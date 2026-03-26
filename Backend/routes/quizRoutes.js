const express = require('express');
const router = express.Router();
const {
    getQuizzes,
    getQuizById,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    submitAttempt,
    getAttemptById,
    getMyProgress,
    getQuizAnalytics,
    getPremiumQuizzes
} = require('../controllers/quizController');

const { protect, authorize } = require('../middleware/auth');

// ─── Progress routes ──────────────────────────────────────────────────────────
// GET /api/quizzes/progress/me  → student's own progress
router.get('/progress/me', protect, getMyProgress);

// GET /api/quizzes/premium  → premium quizzes with access state
router.get('/premium', protect, getPremiumQuizzes);

// ─── Attempt routes ───────────────────────────────────────────────────────────
// GET /api/quizzes/attempts/:attemptId  → get a single attempt result
router.get('/attempts/:attemptId', getAttemptById);

// ─── Quiz CRUD routes ─────────────────────────────────────────────────────────
// GET    /api/quizzes          → list all active quizzes
// POST   /api/quizzes          → create a quiz (admin/teacher)
router.route('/')
    .get(getQuizzes)
    .post(protect, authorize('admin', 'teacher'), createQuiz);

// GET    /api/quizzes/:id       → get single quiz (answers hidden for students)
// PUT    /api/quizzes/:id       → update a quiz
// DELETE /api/quizzes/:id       → delete a quiz
router.route('/:id')
    .get(protect, getQuizById)
    .put(protect, authorize('admin', 'teacher'), updateQuiz)
    .delete(protect, authorize('admin', 'teacher'), deleteQuiz);

// POST   /api/quizzes/:id/attempt  → submit a quiz attempt
router.post('/:id/attempt', protect, submitAttempt);

// GET    /api/quizzes/:id/analytics → admin analytics for a quiz
router.get('/:id/analytics', protect, authorize('admin', 'teacher'), getQuizAnalytics);

module.exports = router;
