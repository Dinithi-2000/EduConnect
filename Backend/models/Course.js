const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please provide a course title'],
            trim: true
        },
        description: {
            type: String,
            required: [true, 'Please provide a course description'],
            trim: true
        },
        instructor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Please provide an instructor']
        },
        thumbnail: {
            type: String,
            default: null
        },
        category: {
            type: String,
            required: [true, 'Please provide a category'],
            trim: true
        },
        level: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner'
        },
        tags: {
            type: [String],
            default: []
        },
        isPublished: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual: total number of enrolled students
courseSchema.virtual('enrollmentCount', {
    ref: 'Enrollment',
    localField: '_id',
    foreignField: 'course',
    count: true
});

module.exports = mongoose.model('Course', courseSchema);
