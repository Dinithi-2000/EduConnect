const mongoose = require('mongoose');

const studyItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    type: {
      type: String,
      enum: ['note', 'bookmark', 'highlight'],
      required: true,
      index: true
    },
    targetType: {
      type: String,
      enum: ['course', 'module', 'content', 'quiz'],
      default: 'content',
      index: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    title: {
      type: String,
      trim: true,
      default: ''
    },
    text: {
      type: String,
      trim: true,
      default: ''
    },
    excerpt: {
      type: String,
      trim: true,
      default: ''
    },
    highlightMeta: {
      startOffset: { type: Number, default: null },
      endOffset: { type: Number, default: null },
      color: { type: String, default: '#fff59d' }
    }
  },
  {
    timestamps: true
  }
);

studyItemSchema.index({ user: 1, type: 1, targetType: 1, targetId: 1, createdAt: -1 });
studyItemSchema.index({ user: 1, courseId: 1, moduleId: 1, contentId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('StudyItem', studyItemSchema);
