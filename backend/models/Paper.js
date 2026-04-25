const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  examCategory: {
    type: String,
    enum: ['CAT-1', 'CAT-2', 'FAT'],
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    default: '',
  },
  fileHash: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'duplicate'],
    default: 'pending',
  },
  description: {
    type: String,
    default: '',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  rejectReason: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

paperSchema.index({ courseId: 1, examCategory: 1, year: -1 });
paperSchema.index({ fileHash: 1 });

module.exports = mongoose.model('Paper', paperSchema);
