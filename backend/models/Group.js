const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  passcode: {
    type: String,
    required: true,
    unique: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
  }],
  maxMembers: {
    type: Number,
    default: 5,
    min: 2,
    max: 20,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Group', groupSchema);
