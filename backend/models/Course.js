const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  courseName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  credits: {
    type: Number,
    default: 3,
  },
  category: {
    type: String,
    default: 'Core',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  enrolledTeachers: [{
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    syllabusUrl: String,
    syllabusType: { type: String, enum: ['file', 'link', ''], default: '' },
    syllabusName: String,
    enrolledAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

// Compound index for unique course codes
courseSchema.index({ courseCode: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
