const mongoose = require('mongoose');

const knowledgeEntrySchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true
    },
    answer: {
      type: String,
      required: true,
      trim: true
    },
    aliases: {
      type: [String],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    resources: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('KnowledgeEntry', knowledgeEntrySchema);
