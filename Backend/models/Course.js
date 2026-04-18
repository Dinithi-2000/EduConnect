const mongoose = require('mongoose');

const contentMetadataSchema = new mongoose.Schema({
    duration: {
        type: Number, // in seconds
        default: 0
    },
    fileSize: {
        type: Number // in bytes
    },
    fileFormat: {
        type: String
    },
    resolution: {
        type: String // e.g. "1080p", "720p"
    },
    pageCount: {
        type: Number
    },
    transcript: {
        type: String
    }
}, { _id: false });

const lessonSchema = new mongoose.Schema({
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
        required: true,
        min: 0
    },
    contentType: {
        type: String,
        enum: ['video', 'document', 'text', 'quiz', 'assignment'],
        required: [true, 'Please provide a content type']
    },
    contentUrl: {
        type: String,
        trim: true,
        default: ''
    },
    contentBody: {
        type: String,
        default: ''
    },
    contentMetadata: {
        type: contentMetadataSchema,
        default: () => ({})
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    isFreePreview: {
        type: Boolean,
        default: false
    }
});

const moduleSchema = new mongoose.Schema({
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
        required: true,
        min: 0
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    lessons: {
        type: [lessonSchema],
        default: []
    }
});

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a course title'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please provide an instructor']
    },
    thumbnail: {
        type: String,
        trim: true,
        default: ''
    },
    category: {
        type: String,
        trim: true,
        default: ''
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    modules: {
        type: [moduleSchema],
        default: []
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);
