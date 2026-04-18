const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Please provide a student']
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: [true, 'Please provide a course']
        },
        // Lesson IDs the student has marked as complete
        completedLessons: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Lesson',
            default: []
        },
        // Overall completion percentage (0-100)
        overallProgress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        lastAccessedAt: {
            type: Date,
            default: null
        },
        // Set when overallProgress reaches 100
        completedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// A student can only enroll in a course once
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
