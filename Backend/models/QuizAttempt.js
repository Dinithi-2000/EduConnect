const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    questionText: String,
    questionType: String,
    selectedAnswer: {
        type: String,
        default: ''
    },
    correctAnswer: String,
    isCorrect: {
        type: Boolean,
        default: false
    },
    marksObtained: {
        type: Number,
        default: 0
    },
    maxMarks: {
        type: Number,
        default: 1
    }
});

const quizAttemptSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: [true, 'Quiz reference is required']
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student reference is required']
    },
    answers: {
        type: [answerSchema],
        default: []
    },
    totalScore: {
        type: Number,
        default: 0
    },
    totalMarks: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0
    },
    grade: {
        type: String,
        enum: ['A+', 'A', 'B', 'C', 'D', 'F'],
        default: 'F'
    },
    timeTaken: {
        // Time taken in seconds
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['in-progress', 'submitted', 'timed-out'],
        default: 'submitted'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    quizTitle: String,
    quizSubject: String,
    quizDifficulty: String
});

// Calculate grade from percentage
function calculateGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
}

quizAttemptSchema.pre('save', function(next) {
    if (this.totalMarks > 0) {
        this.percentage = Math.round((this.totalScore / this.totalMarks) * 100);
    }
    this.grade = calculateGrade(this.percentage);
    next();
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
