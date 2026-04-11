const mongoose = require('mongoose');

const adminStudyMaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },
    materialType: {
      type: String,
      enum: ['past-paper', 'short-note', 'reference'],
      required: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 4000
    },
    linkUrl: {
      type: String,
      trim: true,
      default: ''
    },
    fileUrl: {
      type: String,
      trim: true,
      default: ''
    },
    fileName: {
      type: String,
      trim: true,
      default: ''
    },
    fileMimeType: {
      type: String,
      trim: true,
      default: ''
    },
    fileSize: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

adminStudyMaterialSchema.index({ isPublished: 1, materialType: 1, createdAt: -1 });

module.exports = mongoose.model('AdminStudyMaterial', adminStudyMaterialSchema);
