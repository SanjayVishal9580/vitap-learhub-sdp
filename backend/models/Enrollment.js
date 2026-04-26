const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  completedTopics: [{
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
    completedAt: { type: Date, default: Date.now },
    bestScore: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
  }],
}, {
  timestamps: true,
});

// Ensure a student can only enroll once per teacher's version of a course
enrollmentSchema.index({ studentId: 1, courseId: 1, teacherId: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
