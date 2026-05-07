const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Topic = require('../models/Topic');
const Comment = require('../models/Comment');
const Group = require('../models/Group');
const Message = require('../models/Message');
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
// @desc    Delete user (admin only) - includes cascading deletes
// @access  Private/Admin
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    console.log(`[DELETE USER] Starting cascading delete for user: ${userId}`);
    
    try {
      // 1. Find and delete all enrollments for this student user
      await Enrollment.deleteMany({ studentId: userId });
      console.log(`[DELETE USER] Deleted enrollments`);

      // 2. Remove user from course student lists
      await Course.updateMany(
        { students: userId },
        { $pull: { students: userId } }
      );
      console.log(`[DELETE USER] Removed from course student lists`);

      // 3. If user is a teacher, handle their courses
      // A) Delete courses where teacherId matches (old courses created by this teacher)
      const oldTeacherCourses = await Course.find({ teacherId: userId }).select('_id');
      if (oldTeacherCourses.length > 0) {
        const courseIds = oldTeacherCourses.map(c => c._id);
        
        // Delete all topics for these courses
        await Topic.deleteMany({ courseId: { $in: courseIds } });
        console.log(`[DELETE USER] Deleted topics for old teacher courses`);
        
        // Delete all comments for these courses
        await Comment.deleteMany({ courseId: { $in: courseIds } });
        console.log(`[DELETE USER] Deleted comments for old teacher courses`);
        
        // Delete enrollments related to these courses
        await Enrollment.deleteMany({ courseId: { $in: courseIds } });
        console.log(`[DELETE USER] Deleted enrollments for old teacher courses`);
        
        // Delete the courses themselves
        await Course.deleteMany({ teacherId: userId });
        console.log(`[DELETE USER] Deleted old teacher courses`);
      }

      // B) Remove teacher from enrolledTeachers array in all courses
      await Course.updateMany(
        { 'enrolledTeachers.teacherId': userId },
        { $pull: { enrolledTeachers: { teacherId: userId } } }
      );
      console.log(`[DELETE USER] Removed teacher from enrolledTeachers in courses`);

      // 4. Delete topics created by this user
      await Topic.deleteMany({ createdBy: userId });
      console.log(`[DELETE USER] Deleted created topics`);
      
      // 5. Delete comments by this user
      await Comment.deleteMany({ userId: userId });
      console.log(`[DELETE USER] Deleted user comments`);

      // 6. Remove from all groups
      await Group.updateMany(
        { members: userId },
        { $pull: { members: userId } }
      );
      console.log(`[DELETE USER] Removed from groups`);

      // 7. Delete all messages to/from this user
      await Message.deleteMany({ 
        $or: [{ senderId: userId }, { receiverId: userId }]
      });
      console.log(`[DELETE USER] Deleted messages`);

      // 8. Finally delete the user
      await User.findByIdAndDelete(userId);
      console.log(`[DELETE USER] User deleted successfully`);
      
      res.json({ 
        message: 'User and all related data removed successfully',
        details: {
          cascadeNote: 'All enrollments, courses, topics, and messages deleted. Past papers preserved.'
        }
      });
    } catch (cascadeError) {
      console.error('[DELETE USER] Cascading delete error:', cascadeError.message);
      throw cascadeError;
    }
  } catch (error) {
    console.error('[DELETE USER] Error:', error.message);
    res.status(500).json({ 
      message: 'Error deleting user',
      error: error.message 
    });
  }
});

module.exports = router;
