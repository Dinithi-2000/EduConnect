const mongoose = require('mongoose');

const unlockedContentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      index: true
    },
    itemId: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      default: ''
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

unlockedContentSchema.index({ studentId: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('UnlockedContent', unlockedContentSchema);
