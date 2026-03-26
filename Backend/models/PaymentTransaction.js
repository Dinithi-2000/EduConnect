const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    studentId: {
      type: String,
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true
    },
    premiumItemId: {
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
    currency: {
      type: String,
      required: true,
      default: 'USD'
    },
    paymentGateway: {
      type: String,
      required: true
    },
    paymentReference: {
      type: String,
      default: ''
    },
    billingAddress: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      default: 'completed'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
