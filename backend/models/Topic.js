const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
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
  topicName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  order: {
    type: Number,
    default: 0,
  },
  pptUrl: {
    type: String,
    default: '',
  },
  pptType: {
    type: String,
    enum: ['file', 'link', ''],
    default: '',
  },
  pptName: {
    type: String,
    default: '',
  },
  pptLinks: [{
    title: String,
    url: String,
  }],
  pptFiles: [{
    url: String,
    name: String,
    type: { type: String, default: 'file' }
  }],
  youtubeLinks: [{
    title: String,
    url: String,
  }],
  codeTemplate: {
    type: String,
    default: '',
  },
  codeLanguage: {
    type: String,
    default: 'javascript',
  },
  enableQuiz: {
    type: Boolean,
    default: true,
  },
  quizContext: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

topicSchema.index({ courseId: 1, teacherId: 1, order: 1 });

module.exports = mongoose.model('Topic', topicSchema);
