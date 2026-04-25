const mongoose = require('mongoose');

const aiTutorSessionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true,
  },
  history: [{
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
}, {
  timestamps: true,
});

aiTutorSessionSchema.index({ studentId: 1, topicId: 1 }, { unique: true });

module.exports = mongoose.model('AITutorSession', aiTutorSessionSchema);
