const express = require('express');
const router = express.Router();
const Topic = require('../models/Topic');
const Course = require('../models/Course');
const Comment = require('../models/Comment');
const Enrollment = require('../models/Enrollment');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Wrap multer upload to catch errors gracefully
const handleUpload = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err.message);
      return res.status(400).json({ message: `Upload failed: ${err.message}` });
    }
    next();
  });
};

const handleUploadArray = (fieldName, maxCount) => (req, res, next) => {
  upload.array(fieldName, maxCount)(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err.message);
      return res.status(400).json({ message: `Upload failed: ${err.message}` });
    }
    next();
  });
};

// @route   POST /api/topics
// @desc    Create a new topic
// @access  Private (Teacher)
router.post('/', protect, authorize('teacher'), handleUploadArray('ppts', 10), async (req, res) => {
  try {
    const { courseId, topicName, description, youtubeLinks, codeTemplate, codeLanguage, enableQuiz, quizContext, pptUrl, pptLinks, order } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const isEnrolled = course.enrolledTeachers.some(
      t => t.teacherId.toString() === req.user._id.toString()
    );
    if (!isEnrolled) return res.status(403).json({ message: 'You are not enrolled in this course' });

    const topicCount = await Topic.countDocuments({ courseId, teacherId: req.user._id });

    const topicData = {
      courseId,
      teacherId: req.user._id,
      topicName,
      description: description || '',
      order: order || topicCount + 1,
      youtubeLinks: youtubeLinks ? JSON.parse(youtubeLinks) : [],
      pptLinks: pptLinks ? JSON.parse(pptLinks) : [],
      pptFiles: [],
      codeTemplate: codeTemplate || '',
      codeLanguage: codeLanguage || 'javascript',
      enableQuiz: enableQuiz === 'true' || enableQuiz === true,
      quizContext: quizContext || '',
    };

    if (req.files && req.files.length > 0) {
      topicData.pptFiles = req.files.map(file => ({
        url: file.path,
        name: file.originalname,
        type: 'file'
      }));
    }

    const topic = await Topic.create(topicData);
    res.status(201).json(topic);
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/topics/course/:courseId
// @desc    Get all topics for a course (Admin can view all)
// @access  Private
router.get('/course/:courseId', protect, async (req, res) => {
  try {
    const topics = await Topic.find({ courseId: req.params.courseId })
      .populate('teacherId', 'name email')
      .sort({ order: 1 });
    
    // Filter out topics with deleted teachers
    const validTopics = topics.filter(t => t.teacherId !== null);
    res.json(validTopics);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/topics/course/:courseId/teacher/:teacherId
router.get('/course/:courseId/teacher/:teacherId', protect, async (req, res) => {
  try {
    const topics = await Topic.find({
      courseId: req.params.courseId,
      teacherId: req.params.teacherId,
    }).sort({ order: 1 });
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/topics/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id)
      .populate('teacherId', 'name email avatar')
      .populate('courseId', 'courseCode courseName');
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    if (!topic.teacherId) return res.status(404).json({ message: 'Topic author has been deleted' });
    res.json(topic);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/topics/:id
// @desc    Update a topic (Teacher or Admin)
// @access  Private
router.put('/:id', protect, handleUploadArray('ppts', 10), async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });

    // Check authorization: topic owner (teacher) or admin
    if (topic.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { topicName, description, youtubeLinks, codeTemplate, codeLanguage, enableQuiz, quizContext, pptLinks, removePpt, existingPptFiles, order } = req.body;

    if (topicName) topic.topicName = topicName;
    if (description !== undefined) topic.description = description;
    if (youtubeLinks) topic.youtubeLinks = JSON.parse(youtubeLinks);
    if (pptLinks) topic.pptLinks = JSON.parse(pptLinks);
    if (codeTemplate !== undefined) topic.codeTemplate = codeTemplate;
    if (codeLanguage) topic.codeLanguage = codeLanguage;
    if (enableQuiz !== undefined) topic.enableQuiz = enableQuiz === 'true' || enableQuiz === true;
    if (quizContext !== undefined) topic.quizContext = quizContext;
    if (order !== undefined) topic.order = order;

    // Handle existing multiple PPT files management
    if (existingPptFiles) {
      const parsedExisting = JSON.parse(existingPptFiles);
      // Keep only files that the user hasn't deleted
      topic.pptFiles = topic.pptFiles.filter(file => parsedExisting.includes(file.url));
    }

    // Handle old single PPT file removal (backward compatibility)
    if (removePpt === 'true') {
      topic.pptUrl = '';
      topic.pptType = '';
      topic.pptName = '';
    }

    // Handle new multiple file uploads
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map(file => ({
        url: file.path,
        name: file.originalname,
        type: 'file'
      }));
      topic.pptFiles = [...topic.pptFiles, ...newFiles];
    }

    await topic.save();
    res.json(topic);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/topics/:id
// @desc    Delete a topic (Teacher or Admin)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });

    // Check authorization: topic owner (teacher) or admin
    if (topic.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Topic.findByIdAndDelete(req.params.id);
    res.json({ message: 'Topic deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/topics/:id/complete
// @desc    Mark a topic as complete (if no quiz)
// @access  Private (Student)
router.post('/:id/complete', protect, authorize('student'), async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });

    // Find enrollment
    const enrollment = await Enrollment.findOne({
      studentId: req.user._id,
      courseId: topic.courseId,
      teacherId: topic.teacherId
    });

    if (!enrollment) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    // Check if quiz is required
    if (topic.enableQuiz) {
      return res.status(400).json({ message: 'This topic requires a quiz to be completed' });
    }

    const existing = enrollment.completedTopics.find(t => t.topicId.toString() === req.params.id);
    if (!existing) {
      enrollment.completedTopics.push({ topicId: req.params.id, completedAt: new Date() });
      await enrollment.save();
    }

    res.json({ message: 'Topic marked as complete', completedTopics: enrollment.completedTopics });
  } catch (error) {
    console.error('Complete topic error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ====== COMMENTS ======

// @route   GET /api/topics/:id/comments
router.get('/:id/comments', protect, async (req, res) => {
  try {
    const comments = await Comment.find({ topicId: req.params.id, parentId: null })
      .sort({ createdAt: -1 }).limit(50);
    const replies = await Comment.find({
      topicId: req.params.id, parentId: { $ne: null },
    }).sort({ createdAt: 1 });
    res.json({ comments, replies });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/topics/:id/comments
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { content, parentId } = req.body;
    const comment = await Comment.create({
      topicId: req.params.id,
      userId: req.user._id,
      userName: req.user.name,
      content,
      parentId: parentId || null,
    });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/topics/comments/:commentId/like
router.put('/comments/:commentId/like', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    const likeIndex = comment.likes.indexOf(req.user._id);
    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push(req.user._id);
    }
    await comment.save();
    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/topics/comments/all
// @desc    Get all comments globally (Admin only)
// @access  Private/Admin
router.get('/comments/all', protect, authorize('admin'), async (req, res) => {
  try {
    const comments = await Comment.find().populate('topicId', 'title courseId').sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/topics/comments/:commentId
// @desc    Delete a comment
// @access  Private
router.delete('/comments/:commentId', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Check if user is the author or an admin
    if (comment.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(req.params.commentId);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
