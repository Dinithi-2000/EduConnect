const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
    {
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: [true, 'Please provide a course']
        },
        title: {
            type: String,
            required: [true, 'Please provide a module title'],
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ''
        },
        order: {
            type: Number,
            required: [true, 'Please provide an order'],
            min: 1
        },
        isPublished: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Ensure unique ordering per course
moduleSchema.index({ course: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Module', moduleSchema);
