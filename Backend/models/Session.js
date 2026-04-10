const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: [true, 'Session date is required'],
    },
    duration: {
      type: Number, // in minutes
      required: [true, 'Duration is required'],
      min: [15, 'Duration must be at least 15 minutes'],
    },
    maxParticipants: {
      type: Number,
      required: [true, 'Max participants is required'],
      min: [1, 'At least 1 participant required'],
      max: [100, 'Cannot exceed 100 participants'],
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    meetingLink: {
      type: String,
      default: '',
    },
    lectureMaterial: {
      originalName: { type: String, default: '' },
      filename: { type: String, default: '' },
      path: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    premiumPrice: {
      type: Number,
      min: [0, 'Premium price cannot be negative'],
      default: 0,
    },
    premiumCurrency: {
      type: String,
      trim: true,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    reminderSent: {
      type: Boolean,
      default: false, // Tracks if cron job already sent reminders
    },
  },
  { timestamps: true }
);

// Index for efficient querying by date and status
sessionSchema.index({ date: 1, status: 1 });
sessionSchema.index({ tutor: 1 });
sessionSchema.index({ subject: 1 });

// Virtual: spots remaining
sessionSchema.virtual('spotsRemaining').get(function () {
  return this.maxParticipants - this.participants.length;
});

// Virtual: is session full
sessionSchema.virtual('isFull').get(function () {
  return this.participants.length >= this.maxParticipants;
});

sessionSchema.set('toJSON', { virtuals: true });
sessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Session', sessionSchema);
