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
    getQuizAnalytics
} = require('../controllers/quizController');

const { protect, authorize } = require('../middleware/auth');

// ─── Progress routes ──────────────────────────────────────────────────────────
// GET /api/quizzes/progress/me  → student's own progress
router.get('/progress/me', protect, getMyProgress);

// ─── Attempt routes ───────────────────────────────────────────────────────────
// GET /api/quizzes/attempts/:attemptId  → get a single attempt result
router.get('/attempts/:attemptId', getAttemptById);

// ─── Quiz CRUD routes ─────────────────────────────────────────────────────────
// GET    /api/quizzes          → list all active quizzes
// POST   /api/quizzes          → create a quiz (admin/teacher)
router.route('/')
    .get(getQuizzes)
    .post(createQuiz); // Allow unauthenticated creation for demo; add protect, authorize('admin', 'teacher') in production

// GET    /api/quizzes/:id       → get single quiz (answers hidden for students)
// PUT    /api/quizzes/:id       → update a quiz
// DELETE /api/quizzes/:id       → delete a quiz
router.route('/:id')
    .get(getQuizById)
    .put(updateQuiz)
    .delete(deleteQuiz);

// POST   /api/quizzes/:id/attempt  → submit a quiz attempt
router.post('/:id/attempt', submitAttempt);

// GET    /api/quizzes/:id/analytics → admin analytics for a quiz
router.get('/:id/analytics', getQuizAnalytics);

module.exports = router;
