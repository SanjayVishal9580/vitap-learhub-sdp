const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const CourseRequest = require('../models/CourseRequest');
const { protect, authorize } = require('../middleware/auth');

// Apply middleware to all routes in this file
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Private/Admin
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCourses = await Course.countDocuments();
    const pendingRequests = await CourseRequest.countDocuments({ status: 'pending' });

    res.json({
      totalUsers,
      totalCourses,
      pendingRequests
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/requests
// @desc    Get all course requests
// @access  Private/Admin
router.get('/requests', async (req, res) => {
  try {
    const requests = await CourseRequest.find()
      .populate('requestedBy', 'name email role')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/requests/:id
// @desc    Approve or reject a course request
// @access  Private/Admin
router.put('/requests/:id', async (req, res) => {
  try {
    const { status, adminFeedback } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const courseRequest = await CourseRequest.findById(req.params.id);
    if (!courseRequest) {
      return res.status(404).json({ message: 'Course request not found' });
    }

    courseRequest.status = status;
    if (adminFeedback) courseRequest.adminFeedback = adminFeedback;
    
    await courseRequest.save();

    // If approved, automatically create the course
    if (status === 'approved') {
      const existingCourse = await Course.findOne({ courseCode: courseRequest.courseCode });
      if (!existingCourse) {
        await Course.create({
          courseCode: courseRequest.courseCode,
          courseName: courseRequest.courseName,
          description: courseRequest.description,
          credits: courseRequest.credits,
          category: courseRequest.category
        });
      }
    }

    res.json(courseRequest);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role
// @access  Private/Admin
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({ message: 'Role updated successfully', user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id/approve
// @desc    Approve or reject a teacher
// @access  Private/Admin
router.put('/users/:id/approve', async (req, res) => {
  try {
    const { approvalStatus } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.approvalStatus = approvalStatus;
    await user.save();

    res.json({ message: `Teacher ${approvalStatus} successfully`, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
