const mongoose = require('mongoose');

const receiptQueueItemSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true
    },
    transactionId: {
      type: String,
      required: true,
      index: true
    },
    itemTitle: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    queuedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      default: 'queued'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ReceiptQueueItem', receiptQueueItemSchema);
