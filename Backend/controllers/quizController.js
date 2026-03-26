const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const { hasUnlockedContent } = require('../utils/platformStore');

const isPrivilegedUser = (user) => !!user && ['admin', 'teacher'].includes(user.role);
const getPremiumItemId = (quizId) => `quiz-premium-${quizId}`;

// ─── Quiz CRUD ────────────────────────────────────────────────────────────────

// @desc    Get all active quizzes
// @route   GET /api/quizzes
// @access  Public
const getQuizzes = async (req, res) => {
    try {
        const { subject, difficulty, search } = req.query;
        let filter = { isActive: true };

        if (subject) filter.subject = { $regex: subject, $options: 'i' };
        if (difficulty) filter.difficulty = difficulty;
        if (search) filter.title = { $regex: search, $options: 'i' };

        const quizzes = await Quiz.find(filter)
            .select('-questions.correctAnswer -questions.explanation')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: quizzes.length, data: quizzes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get single quiz (with answers hidden unless admin/teacher)
// @route   GET /api/quizzes/:id
// @access  Public
const getQuizById = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate('createdBy', 'name email');
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        if (quiz.isPremium && !isPrivilegedUser(req.user)) {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    code: 'PREMIUM_LOGIN_REQUIRED',
                    message: 'Please log in to access premium quizzes.'
                });
            }

            const unlocked = await hasUnlockedContent({
                studentId: req.user._id.toString(),
                itemId: getPremiumItemId(quiz._id.toString())
            });

            if (!unlocked) {
                return res.status(403).json({
                    success: false,
                    code: 'PREMIUM_LOCKED',
                    message: 'This premium quiz requires purchase before access.'
                });
            }
        }

        // Hide correct answers for students during attempt
        const isAdmin = isPrivilegedUser(req.user);
        if (!isAdmin) {
            const sanitized = quiz.toObject();
            sanitized.questions = sanitized.questions.map(q => {
                const { correctAnswer, explanation, ...rest } = q;
                return rest;
            });
            return res.json({ success: true, data: sanitized });
        }

        res.json({ success: true, data: quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Create a quiz
// @route   POST /api/quizzes
// @access  Admin / Teacher
const createQuiz = async (req, res) => {
    try {
        const quizData = { ...req.body };
        quizData.isPremium = Boolean(quizData.isPremium);
        quizData.premiumPrice = quizData.isPremium ? Number(quizData.premiumPrice || 0) : 0;
        quizData.premiumCurrency = (quizData.premiumCurrency || 'USD').toUpperCase();

        if (req.user) quizData.createdBy = req.user._id;

        const quiz = await Quiz.create(quizData);
        res.status(201).json({ success: true, data: quiz });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Failed to create quiz', error: error.message });
    }
};

// @desc    Update a quiz
// @route   PUT /api/quizzes/:id
// @access  Admin / Teacher
const updateQuiz = async (req, res) => {
    try {
        const updatePayload = { ...req.body };
        if (Object.prototype.hasOwnProperty.call(updatePayload, 'isPremium')) {
            updatePayload.isPremium = Boolean(updatePayload.isPremium);
        }
        if (Object.prototype.hasOwnProperty.call(updatePayload, 'premiumPrice')) {
            updatePayload.premiumPrice = Number(updatePayload.premiumPrice || 0);
        }
        if (Object.prototype.hasOwnProperty.call(updatePayload, 'isPremium') && !updatePayload.isPremium) {
            updatePayload.premiumPrice = 0;
        }
        if (Object.prototype.hasOwnProperty.call(updatePayload, 'premiumCurrency')) {
            updatePayload.premiumCurrency = String(updatePayload.premiumCurrency || 'USD').toUpperCase();
        }

        const quiz = await Quiz.findByIdAndUpdate(req.params.id, updatePayload, {
            new: true,
            runValidators: true
        });
        if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
        // Recalculate totalMarks
        quiz.totalMarks = quiz.questions.reduce((s, q) => s + q.marks, 0);
        await quiz.save();
        res.json({ success: true, data: quiz });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Failed to update quiz', error: error.message });
    }
};

// @desc    Delete a quiz
// @route   DELETE /api/quizzes/:id
// @access  Admin / Teacher
const deleteQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findByIdAndDelete(req.params.id);
        if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
        res.json({ success: true, message: 'Quiz deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─── Quiz Attempt & Grading ───────────────────────────────────────────────────

// @desc    Submit quiz attempt (auto-grades)
// @route   POST /api/quizzes/:id/attempt
// @access  Students (optionally authenticated)
const submitAttempt = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

        if (quiz.isPremium && !isPrivilegedUser(req.user)) {
            const unlocked = await hasUnlockedContent({
                studentId: req.user._id.toString(),
                itemId: getPremiumItemId(quiz._id.toString())
            });

            if (!unlocked) {
                return res.status(403).json({
                    success: false,
                    code: 'PREMIUM_LOCKED',
                    message: 'Purchase this premium quiz before attempting it.'
                });
            }
        }

        const { answers, timeTaken, status } = req.body;
        // answers: [{ questionId, selectedAnswer }]

        let totalScore = 0;
        const gradedAnswers = quiz.questions.map(question => {
            const studentAnswer = answers?.find(a => a.questionId === question._id.toString());
            const selected = studentAnswer ? studentAnswer.selectedAnswer : '';

            let isCorrect = false;
            if (question.questionType === 'MCQ') {
                isCorrect = selected === question.correctAnswer;
            } else if (question.questionType === 'TrueFalse') {
                isCorrect = selected.toLowerCase() === question.correctAnswer.toLowerCase();
            } else if (question.questionType === 'ShortAnswer') {
                isCorrect = selected.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
            }

            const marksObtained = isCorrect ? question.marks : 0;
            totalScore += marksObtained;

            return {
                questionId: question._id,
                questionText: question.questionText,
                questionType: question.questionType,
                selectedAnswer: selected,
                correctAnswer: question.correctAnswer,
                isCorrect,
                marksObtained,
                maxMarks: question.marks
            };
        });

        const attemptData = {
            quiz: quiz._id,
            student: req.user ? req.user._id : null,
            answers: gradedAnswers,
            totalScore,
            totalMarks: quiz.totalMarks,
            timeTaken: timeTaken || 0,
            status: status || 'submitted',
            quizTitle: quiz.title,
            quizSubject: quiz.subject,
            quizDifficulty: quiz.difficulty
        };

        const attempt = await QuizAttempt.create(attemptData);
        res.status(201).json({ success: true, data: attempt });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Failed to submit attempt', error: error.message });
    }
};

// @desc    Get all premium quizzes with student access status
// @route   GET /api/quizzes/premium
// @access  Authenticated users
const getPremiumQuizzes = async (req, res) => {
    try {
        const premiumQuizzes = await Quiz.find({ isActive: true, isPremium: true })
            .select('-questions.correctAnswer -questions.explanation')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        const isAdmin = isPrivilegedUser(req.user);
        const studentId = req.user?._id ? req.user._id.toString() : null;

        const data = await Promise.all(
            premiumQuizzes.map(async (quiz) => {
                const quizObj = quiz.toObject();
                const premiumItemId = getPremiumItemId(quizObj._id.toString());
                const hasAccess = isAdmin || (studentId
                    ? await hasUnlockedContent({ studentId, itemId: premiumItemId })
                    : false);

                return {
                    ...quizObj,
                    premiumItemId,
                    hasAccess
                };
            })
        );

        return res.json({ success: true, count: data.length, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get a single attempt by ID
// @route   GET /api/quizzes/attempts/:attemptId
// @access  Public
const getAttemptById = async (req, res) => {
    try {
        const attempt = await QuizAttempt.findById(req.params.attemptId)
            .populate('quiz', 'title subject difficulty timeLimit questions')
            .populate('student', 'name email');

        if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
        res.json({ success: true, data: attempt });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get student's own progress (all their attempts)
// @route   GET /api/quizzes/progress/me
// @access  Authenticated students
const getMyProgress = async (req, res) => {
    try {
        const studentId = req.user ? req.user._id : req.query.studentId;
        const attempts = await QuizAttempt.find({ student: studentId })
            .populate('quiz', 'title subject difficulty')
            .sort({ submittedAt: -1 });

        // Build summary stats
        const totalAttempts = attempts.length;
        const averageScore = totalAttempts
            ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / totalAttempts)
            : 0;
        const bestScore = totalAttempts
            ? Math.max(...attempts.map(a => a.percentage))
            : 0;

        // Subject breakdown
        const subjectMap = {};
        attempts.forEach(a => {
            const sub = a.quizSubject || 'General';
            if (!subjectMap[sub]) subjectMap[sub] = { total: 0, count: 0 };
            subjectMap[sub].total += a.percentage;
            subjectMap[sub].count += 1;
        });
        const subjectBreakdown = Object.entries(subjectMap).map(([subject, data]) => ({
            subject,
            averageScore: Math.round(data.total / data.count),
            attempts: data.count
        }));

        res.json({
            success: true,
            data: {
                summary: { totalAttempts, averageScore, bestScore },
                attempts,
                subjectBreakdown
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get admin analytics (class average, per student, per question)
// @route   GET /api/quizzes/:id/analytics
// @access  Admin / Teacher
const getQuizAnalytics = async (req, res) => {
    try {
        const attempts = await QuizAttempt.find({ quiz: req.params.id })
            .populate('student', 'name email');

        if (!attempts.length) {
            return res.json({ success: true, data: { attempts: [], classAverage: 0, totalStudents: 0 } });
        }

        const classAverage = Math.round(
            attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length
        );

        // Grade distribution
        const gradeCount = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
        attempts.forEach(a => { gradeCount[a.grade] = (gradeCount[a.grade] || 0) + 1; });

        res.json({
            success: true,
            data: {
                totalStudents: attempts.length,
                classAverage,
                gradeDistribution: gradeCount,
                attempts: attempts.map(a => ({
                    student: a.student,
                    score: a.totalScore,
                    totalMarks: a.totalMarks,
                    percentage: a.percentage,
                    grade: a.grade,
                    submittedAt: a.submittedAt
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

module.exports = {
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
};
