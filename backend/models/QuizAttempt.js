const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
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
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true,
  },
  questions: [{
    question: String,
    options: [String],
    correctAnswer: String,
    studentAnswer: String,
    isCorrect: Boolean,
  }],
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    default: 10,
  },
  difficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD'],
    default: 'MEDIUM',
  },
  xpAwarded: {
    type: Number,
    default: 0,
  },
  tabSwitches: {
    type: Number,
    default: 0,
  },
  fullscreenExits: {
    type: Number,
    default: 0,
  },
  timeTaken: {
    type: Number, // in seconds
    default: 0,
  },
  flagged: {
    type: Boolean,
    default: false,
  },
  flagReason: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['PASSED', 'FAILED', 'SUSPICIOUS', 'INVALIDATED'],
    default: 'PASSED',
  },
  isPractice: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

quizAttemptSchema.index({ studentId: 1, topicId: 1 });
quizAttemptSchema.index({ courseId: 1, teacherId: 1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
