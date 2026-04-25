const mongoose = require('mongoose');

const courseRequestSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: [true, 'Please add a course code'],
    uppercase: true,
  },
  courseName: {
    type: String,
    required: [true, 'Please add a course name'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
  },
  credits: {
    type: Number,
    required: [true, 'Please add credits'],
    min: 1,
    max: 6,
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['Core', 'Elective', 'Lab', 'Project'],
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  adminFeedback: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('CourseRequest', courseRequestSchema);
