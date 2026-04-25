const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student',
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved', // Default to approved (for students)
  },
  avatar: {
    type: String,
    default: '',
  },
  xp: {
    type: Number,
    default: 0,
  },
  level: {
    type: Number,
    default: 1,
  },
  streak: {
    type: Number,
    default: 0,
  },
  lastStudyDate: {
    type: Date,
    default: null,
  },
  achievements: [{
    name: String,
    description: String,
    icon: String,
    earnedAt: { type: Date, default: Date.now },
  }],
  totalQuizzes: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  topicsCompleted: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate level from XP
userSchema.methods.calculateLevel = function() {
  // Every 100 XP = 1 level
  this.level = Math.floor(this.xp / 100) + 1;
  return this.level;
};

module.exports = mongoose.model('User', userSchema);
