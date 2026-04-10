const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['lost-item', 'found-item', 'announcement', 'event', 'help-request', 'idea-tip'],
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  authorEmail: {
    type: String,
    required: true
  },
  category: {
    type: String,
    trim: true
  },
  tags: [String],
  imageUrl: {
    type: String
  },
  imageUrls: {
    type: [String],
    default: []
  },
  location: {
    type: String,
    trim: true
  },
  contactInfo: {
    type: String,
    trim: true
  },
  replies: [
    {
      id: String,
      authorId: mongoose.Schema.Types.ObjectId,
      authorName: String,
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  status: {
    type: String,
    enum: ['active', 'pending', 'flagged', 'removed'],
    default: 'active'
  },
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: String,
  views: {
    type: Number,
    default: 0
  },
  upvotes: {
    type: Number,
    default: 0
  },
  upvotedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CommunityPost', communityPostSchema);
