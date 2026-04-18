const mongoose = require('mongoose');

const contentItemSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please provide a content item title'],
            trim: true
        },
        type: {
            type: String,
            enum: ['video', 'pdf', 'link', 'text'],
            required: [true, 'Please provide a content type']
        },
        url: {
            type: String,
            default: null
        },
        // Duration in seconds (for video items)
        duration: {
            type: Number,
            default: null
        },
        // File size in kilobytes (for pdf items)
        size: {
            type: Number,
            default: null
        },
        order: {
            type: Number,
            required: [true, 'Please provide an order'],
            min: 1
        }
    },
    { _id: true }
);

const lessonSchema = new mongoose.Schema(
    {
        module: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Module',
            required: [true, 'Please provide a module']
        },
        title: {
            type: String,
            required: [true, 'Please provide a lesson title'],
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
        // Duration in seconds (sum of video content items)
        duration: {
            type: Number,
            default: 0
        },
        // Whether unenrolled users can preview this lesson
        isPreview: {
            type: Boolean,
            default: false
        },
        isPublished: {
            type: Boolean,
            default: false
        },
        contentItems: {
            type: [contentItemSchema],
            default: []
        }
    },
    { timestamps: true }
);

// Ensure unique ordering per module
lessonSchema.index({ module: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Lesson', lessonSchema);
