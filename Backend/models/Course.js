const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Content title is required'],
    trim: true
  },
  contentType: {
    type: String,
    enum: ['LectureVideo', 'LecturePDF', 'ShortNote', 'Video', 'PDF', 'Article', 'Link', 'Quiz'],
    required: [true, 'Content type is required']
  },
  url: {
    type: String,
    trim: true,
    default: ''
  },
  textContent: {
    type: String,
    trim: true,
    default: ''
  },
  durationMinutes: {
    type: Number,
    min: [0, 'Duration cannot be negative'],
    default: 0
  },
  order: {
    type: Number,
    min: [0, 'Order cannot be negative'],
    default: 0
  },
  isPreview: {
    type: Boolean,
    default: false
  }
});

const faqItemSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'FAQ question is required'],
    trim: true
  },
  answer: {
    type: String,
    required: [true, 'FAQ answer is required'],
    trim: true
  }
});

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Module title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  order: {
    type: Number,
    min: [0, 'Order cannot be negative'],
    default: 0
  },
  contents: {
    type: [contentSchema],
    default: []
  },
  faqs: {
    type: [faqItemSchema],
    default: []
  }
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  thumbnailUrl: {
    type: String,
    trim: true,
    default: ''
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  modules: {
    type: [moduleSchema],
    default: []
  },
  faqs: {
    type: [faqItemSchema],
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

courseSchema.pre('save', function saveHook(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Course', courseSchema);
