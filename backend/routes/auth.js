const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize, generateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Prevent creating admin via signup
    if (role === 'admin') {
      return res.status(403).json({ message: 'Cannot create admin account via signup' });
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'student',
      approvalStatus: role === 'teacher' ? 'pending' : 'approved',
    });

    // For teachers, don't login directly
    if (user.role === 'teacher') {
      return res.status(201).json({ 
        message: 'Account created successfully! Please wait for 24 hours for admin approval before trying to login.',
        role: 'teacher'
      });
    }

    // Generate token for students
    const token = generateToken(user._id, user.role, user.email);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        achievements: user.achievements,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user with password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check approval status
    if (user.approvalStatus === 'pending') {
      return res.status(403).json({ message: 'Your account is pending review. Please try again after 24 hours.' });
    }
    if (user.approvalStatus === 'rejected') {
      return res.status(403).json({ message: 'Your teacher signup request has been rejected.' });
    }

    // Generate token
    const token = generateToken(user._id, user.role, user.email);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        achievements: user.achievements,
        avatar: user.avatar,
        topicsCompleted: user.topicsCompleted,
        totalQuizzes: user.totalQuizzes,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        achievements: user.achievements,
        avatar: user.avatar,
        topicsCompleted: user.topicsCompleted,
        totalQuizzes: user.totalQuizzes,
        lastStudyDate: user.lastStudyDate,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, upload.single('avatar'), async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    
    // Support both direct avatar string/URL (for selection) and file upload
    if (req.body.avatar) {
      user.avatar = req.body.avatar;
    } else if (req.file && req.file.path) {
      user.avatar = req.file.path; // CloudinaryStorage puts the secure_url in path
    }

    await user.save();

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
