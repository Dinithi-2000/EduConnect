const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true
    },
    questionType: {
        type: String,
        enum: ['MCQ', 'TrueFalse', 'ShortAnswer'],
        required: [true, 'Question type is required']
    },
    options: {
        // For MCQ: array of strings e.g. ["Paris", "London", "Berlin", "Madrid"]
        type: [String],
        default: []
    },
    correctAnswer: {
        // MCQ: index (0-3), TrueFalse: "True"/"False", ShortAnswer: string
        type: String,
        required: [true, 'Correct answer is required']
    },
    marks: {
        type: Number,
        required: [true, 'Marks are required'],
        min: [1, 'Marks must be at least 1'],
        default: 1
    },
    explanation: {
        type: String,
        trim: true,
        default: ''
    }
});

const quizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Quiz title is required'],
        trim: true
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Medium'
    },
    assessmentType: {
        type: String,
        enum: ['Quiz', 'MockExam'],
        default: 'Quiz'
    },
    timeLimit: {
        // Time limit in minutes
        type: Number,
        required: [true, 'Time limit is required'],
        min: [1, 'Time limit must be at least 1 minute']
    },
    questions: {
        type: [questionSchema],
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'Quiz must have at least one question'
        }
    },
    totalMarks: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    premiumPrice: {
        type: Number,
        default: 0,
        min: [0, 'Premium price cannot be negative']
    },
    premiumCurrency: {
        type: String,
        trim: true,
        default: 'USD'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-calculate total marks before save
quizSchema.pre('save', function(next) {
    this.totalMarks = this.questions.reduce((sum, q) => sum + q.marks, 0);
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Quiz', quizSchema);
