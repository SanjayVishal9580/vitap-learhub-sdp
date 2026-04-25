const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const QuizAttempt = require('../models/QuizAttempt');
const Enrollment = require('../models/Enrollment');
const Topic = require('../models/Topic');
const { protect, authorize } = require('../middleware/auth');
const { generateTeacherRecommendations } = require('../services/geminiService');

// @route   GET /api/analytics/student
router.get('/student', protect, authorize('student'), async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ studentId: req.user._id })
      .populate('courseId', 'courseCode courseName')
      .populate('teacherId', 'name');

    const quizAttempts = await QuizAttempt.find({ studentId: req.user._id })
      .populate('topicId', 'topicName')
      .populate('courseId', 'courseCode courseName')
      .sort({ createdAt: -1 });

    const totalScore = quizAttempts.reduce((sum, a) => sum + a.score, 0);
    const avgScore = quizAttempts.length > 0 ? (totalScore / quizAttempts.length).toFixed(1) : 0;

    res.json({
      enrollments,
      quizAttempts,
      stats: {
        totalQuizzes: quizAttempts.length,
        avgScore,
        totalXP: req.user.xp,
        level: req.user.level,
        streak: req.user.streak,
        topicsCompleted: req.user.topicsCompleted,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/analytics/teacher/:courseId
router.get('/teacher/:courseId', protect, authorize('teacher'), async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const teacherId = req.user._id;

    const studentCount = await Enrollment.countDocuments({ courseId, teacherId });
    const topics = await Topic.find({ courseId, teacherId }).sort({ order: 1 });

    const topicAnalytics = await Promise.all(topics.map(async (topic) => {
      // Only count non-practice, non-invalidated attempts for class analytics
      const attempts = await QuizAttempt.find({ 
        topicId: topic._id, 
        teacherId,
        isPractice: false,
        status: { $ne: 'INVALIDATED' }
      });

      const passed = attempts.filter(a => a.status === 'PASSED').length;
      const totalScore = attempts.reduce((s, a) => s + a.score, 0);
      const avgScore = attempts.length > 0 ? (totalScore / attempts.length).toFixed(1) : 0;
      const passRate = attempts.length > 0 ? Math.round((passed / attempts.length) * 100) : 0;
      
      let recommendations = [];
      // Lower threshold to 3 attempts for recommendations
      if (attempts.length >= 3) {
        try {
          recommendations = await generateTeacherRecommendations({
            topicName: topic.topicName, passRate, avgScore, totalAttempts: attempts.length,
          });
        } catch (e) { 
          console.error(`Recommendation error for ${topic.topicName}:`, e.message);
          recommendations = []; 
        }
      }

      return {
        topicId: topic._id, 
        topicName: topic.topicName,
        totalAttempts: attempts.length, 
        passRate, 
        avgScore, 
        recommendations,
      };
    }));

    const allAttempts = await QuizAttempt.find({ 
      courseId, 
      teacherId,
      isPractice: false,
      status: { $ne: 'INVALIDATED' }
    });

    // Fetch enrolled students with their individual progress
    const enrollments = await Enrollment.find({ courseId, teacherId })
      .populate('studentId', 'name email avatar xp level');
    
    const students = enrollments.map(e => ({
      _id: e.studentId._id,
      name: e.studentId.name,
      avatar: e.studentId.avatar,
      xp: e.studentId.xp,
      level: e.studentId.level,
      completedCount: e.completedTopics?.length || 0,
      lastActivity: e.updatedAt
    })).sort((a, b) => b.completedCount - a.completedCount);

    // Consistent order for distribution
    const distribution = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, 'below-60': 0 };
    allAttempts.forEach(a => {
      const total = a.totalQuestions || 10;
      const pct = (a.score / total) * 100;
      if (pct >= 90) distribution['90-100']++;
      else if (pct >= 80) distribution['80-89']++;
      else if (pct >= 70) distribution['70-79']++;
      else if (pct >= 60) distribution['60-69']++;
      else distribution['below-60']++;
    });

    res.json({ 
      studentCount, 
      topicAnalytics, 
      distribution, 
      totalAttempts: allAttempts.length,
      students 
    });
  } catch (error) {
    console.error('Teacher analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/analytics/admin
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalCourses = await Course.countDocuments();
    const totalQuizzes = await QuizAttempt.countDocuments();
    const flaggedQuizzes = await QuizAttempt.countDocuments({ flagged: true });
    res.json({ totalStudents, totalTeachers, totalCourses, totalQuizzes, flaggedQuizzes });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
