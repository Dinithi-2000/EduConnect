const mongoose = require('mongoose');

const contactReplySchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    repliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const contactMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    attachments: [
      {
        url: {
          type: String,
          required: true,
          trim: true,
        },
        originalName: {
          type: String,
          required: true,
          trim: true,
        },
        mimeType: {
          type: String,
          required: true,
          trim: true,
        },
        size: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    status: {
      type: String,
      enum: ['open', 'replied'],
      default: 'open',
      index: true,
    },
    adminReply: {
      type: contactReplySchema,
      default: null,
    },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
