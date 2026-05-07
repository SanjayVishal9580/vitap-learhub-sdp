const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const CourseRequest = require('../models/CourseRequest');
const Enrollment = require('../models/Enrollment');
const Topic = require('../models/Topic');
const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');
const Comment = require('../models/Comment');
const Paper = require('../models/Paper');
const AITutorSession = require('../models/AITutorSession');
const Group = require('../models/Group');
const Message = require('../models/Message');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

// Helper to delete from Cloudinary
const deleteFromCloudinary = async (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return;
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return;
    const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
    const publicId = publicIdWithExt.split('.')[0];
    let resourceType = 'image';
    if (url.match(/\.(docx|doc|pptx|ppt)$/i)) resourceType = 'raw';
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary cleanup error:', error);
  }
};

// @route   GET /api/courses
// @desc    Get all courses
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const courses = await Course.find({ status: 'active' })
      .populate('enrolledTeachers.teacherId', 'name email avatar')
      .sort({ courseCode: 1 });
    
    // Filter out courses with no valid teachers (deleted teacher references)
    const validCourses = courses.map(course => {
      const validTeachers = course.enrolledTeachers.filter(t => t.teacherId !== null);
      return {
        ...course.toObject(),
        enrolledTeachers: validTeachers
      };
    }).filter(course => course.enrolledTeachers.length > 0);
    
    res.json(validCourses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/courses/:id
// @desc    Get single course with details
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('enrolledTeachers.teacherId', 'name email avatar');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Filter out deleted teacher references
    const validTeachers = course.enrolledTeachers.filter(t => t.teacherId !== null);
    
    if (validTeachers.length === 0) {
      return res.status(404).json({ message: 'Course has no valid teachers' });
    }

    // Get student count per teacher
    const teacherStats = await Promise.all(
      validTeachers.map(async (t) => {
        const studentCount = await Enrollment.countDocuments({
          courseId: course._id,
          teacherId: t.teacherId._id,
        });
        return {
          ...t.toObject(),
          studentCount,
        };
      })
    );

    res.json({
      ...course.toObject(),
      enrolledTeachers: teacherStats,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/courses/:id/enroll-teacher
// @desc    Teacher enrolls in a course
// @access  Private (Teacher)
router.post('/:id/enroll-teacher', protect, authorize('teacher'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if teacher already enrolled
    const alreadyEnrolled = course.enrolledTeachers.some(
      t => t.teacherId.toString() === req.user._id.toString()
    );
    if (alreadyEnrolled) {
      return res.status(400).json({ message: 'You are already enrolled in this course' });
    }

    course.enrolledTeachers.push({
      teacherId: req.user._id,
      enrolledAt: new Date(),
    });

    await course.save();

    const updatedCourse = await Course.findById(req.params.id)
      .populate('enrolledTeachers.teacherId', 'name email avatar');

    res.json({ message: 'Enrolled successfully', course: updatedCourse });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/courses/:id/syllabus
// @desc    Upload syllabus for a course (teacher)
// @access  Private (Teacher)
router.put('/:id/syllabus', protect, authorize('teacher'), upload.single('syllabus'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const teacherEntry = course.enrolledTeachers.find(
      t => t.teacherId.toString() === req.user._id.toString()
    );
    if (!teacherEntry) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    if (req.file) {
      teacherEntry.syllabusUrl = req.file.path;
      teacherEntry.syllabusType = 'file';
      teacherEntry.syllabusName = req.file.originalname;
    } else if (req.body.syllabusUrl) {
      teacherEntry.syllabusUrl = req.body.syllabusUrl;
      teacherEntry.syllabusType = 'link';
      teacherEntry.syllabusName = req.body.syllabusName || 'Syllabus Link';
    }

    await course.save();

    res.json({ message: 'Syllabus updated successfully', course });
  } catch (error) {
    console.error('Syllabus upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/courses/:id/enroll-student
// @desc    Student enrolls in a teacher's version of a course
// @access  Private (Student)
router.post('/:id/enroll-student', protect, authorize('student'), async (req, res) => {
  try {
    const { teacherId } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Verify teacher is enrolled in this course
    const teacherEnrolled = course.enrolledTeachers.some(
      t => t.teacherId.toString() === teacherId
    );
    if (!teacherEnrolled) {
      return res.status(400).json({ message: 'This teacher is not enrolled in this course' });
    }

    // Check if student already enrolled with this teacher
    const existing = await Enrollment.findOne({
      studentId: req.user._id,
      courseId: req.params.id,
      teacherId,
    });
    if (existing) {
      return res.status(400).json({ message: 'Already enrolled in this course with this teacher' });
    }

    const enrollment = await Enrollment.create({
      studentId: req.user._id,
      courseId: req.params.id,
      teacherId,
    });

    res.status(201).json({ message: 'Enrolled successfully', enrollment });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/courses/my/enrolled
// @desc    Get courses the current user is enrolled in
// @access  Private
router.get('/my/enrolled', protect, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const courses = await Course.find({
        'enrolledTeachers.teacherId': req.user._id,
      }).populate('enrolledTeachers.teacherId', 'name email avatar');
      return res.json(courses);
    }

    if (req.user.role === 'student') {
      const enrollments = await Enrollment.find({ studentId: req.user._id })
        .populate('courseId')
        .populate('teacherId', 'name email avatar');
      return res.json(enrollments);
    }

    // Admin gets all courses
    const courses = await Course.find()
      .populate('enrolledTeachers.teacherId', 'name email avatar');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/courses/:id/students
// @desc    Get students enrolled in a teacher's course version
// @access  Private (Teacher)
router.get('/:id/students', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      courseId: req.params.id,
      teacherId: req.user.role === 'teacher' ? req.user._id : req.query.teacherId,
    }).populate('studentId', 'name email avatar xp level streak');

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/courses
// @desc    Create a new course (Admin only)
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseCode, courseName, description, credits, category } = req.body;
    const course = await Course.create({
      courseCode, courseName, description, credits, category
    });
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update a course (Admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/courses/request
// @desc    Request a new course
// @access  Private
router.post('/request', protect, async (req, res) => {
  try {
    const { courseCode, courseName, description, credits, category } = req.body;
    
    // Check if course already exists
    const existingCourse = await Course.findOne({ courseCode: courseCode.toUpperCase() });
    if (existingCourse) {
      return res.status(400).json({ message: 'Course with this code already exists' });
    }

    const courseRequest = await CourseRequest.create({
      courseCode,
      courseName,
      description,
      credits,
      category,
      requestedBy: req.user._id,
    });
    
    res.status(201).json({ message: 'Course request submitted successfully', courseRequest });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete a course (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    
    // Cleanup enrollments and topics
    await Enrollment.deleteMany({ courseId: course._id });
    await Topic.deleteMany({ courseId: course._id });
    await Course.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/courses/:id/unenroll-student/:teacherId
// @desc    Student unenrolls from a course
// @access  Private (Student)
router.delete('/:id/unenroll-student/:teacherId', protect, authorize('student'), async (req, res) => {
  try {
    const { id: courseId, teacherId } = req.params;
    const studentId = req.user._id;

    // 1. Delete Enrollment
    const enrollment = await Enrollment.findOneAndDelete({ studentId, courseId, teacherId });
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // 2. Delete QuizAttempts
    await QuizAttempt.deleteMany({ studentId, courseId, teacherId });

    // 3. Delete AI Tutor Sessions
    const topics = await Topic.find({ courseId, teacherId });
    const topicIds = topics.map(t => t._id);
    await AITutorSession.deleteMany({ studentId, topicId: { $in: topicIds } });

    // 4. Delete Comments
    await Comment.deleteMany({ userId: studentId, topicId: { $in: topicIds } });

    // 5. Delete Papers uploaded by student for this course
    const papers = await Paper.find({ uploadedBy: studentId, courseId });
    for (const paper of papers) {
      await deleteFromCloudinary(paper.fileUrl);
    }
    await Paper.deleteMany({ uploadedBy: studentId, courseId });

    // 6. Remove from Groups and delete messages
    const groups = await Group.find({ courseId });
    const groupIds = groups.map(g => g._id);
    
    // Remove from group members
    await Group.updateMany(
      { courseId },
      { $pull: { members: { userId: studentId } } }
    );
    
    // Delete messages in those groups
    const messages = await Message.find({ senderId: studentId, groupId: { $in: groupIds } });
    for (const msg of messages) {
      if (msg.fileUrl) await deleteFromCloudinary(msg.fileUrl);
    }
    await Message.deleteMany({ senderId: studentId, groupId: { $in: groupIds } });

    res.json({ message: 'Unenrolled successfully and your data for this course has been cleared' });
  } catch (error) {
    console.error('Unenroll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/courses/:id/unenroll-teacher
// @desc    Teacher unenrolls from a course
// @access  Private (Teacher)
router.delete('/:id/unenroll-teacher', protect, authorize('teacher'), async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const teacherId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // 1. Remove teacher from Course.enrolledTeachers and clean syllabus
    const teacherEntry = course.enrolledTeachers.find(t => t.teacherId.toString() === teacherId.toString());
    if (teacherEntry && teacherEntry.syllabusUrl) {
      await deleteFromCloudinary(teacherEntry.syllabusUrl);
    }
    course.enrolledTeachers = course.enrolledTeachers.filter(
      t => t.teacherId.toString() !== teacherId.toString()
    );
    await course.save();

    // 2. Get all Topics for this teacher and course and clean files
    const topics = await Topic.find({ courseId, teacherId });
    for (const topic of topics) {
      if (topic.pptUrl) await deleteFromCloudinary(topic.pptUrl);
      if (topic.pptFiles && topic.pptFiles.length > 0) {
        for (const file of topic.pptFiles) {
          await deleteFromCloudinary(file.url);
        }
      }
    }
    const topicIds = topics.map(t => t._id);

    // 3. Delete Topics
    await Topic.deleteMany({ courseId, teacherId });

    // 4. Delete QuizAttempts (by students) for these topics
    await QuizAttempt.deleteMany({ topicId: { $in: topicIds } });

    // 5. Delete Comments on these topics
    await Comment.deleteMany({ topicId: { $in: topicIds } });

    // 7. Delete AI Tutor Sessions for these topics
    await AITutorSession.deleteMany({ topicId: { $in: topicIds } });

    // 8. Delete Enrollments of students under this teacher
    await Enrollment.deleteMany({ courseId, teacherId });

    // 9. Groups and messages
    const groups = await Group.find({ courseId });
    const groupIds = groups.map(g => g._id);
    
    // Remove teacher from group members
    await Group.updateMany(
      { courseId },
      { $pull: { members: { userId: teacherId } } }
    );
    
    // Delete messages by teacher in any group of this course
    const messages = await Message.find({ senderId: teacherId, groupId: { $in: groupIds } });
    for (const msg of messages) {
      if (msg.fileUrl) await deleteFromCloudinary(msg.fileUrl);
    }
    await Message.deleteMany({ senderId: teacherId, groupId: { $in: groupIds } });

    res.json({ message: 'Unenrolled successfully and your course content has been removed' });
  } catch (error) {
    console.error('Teacher unenroll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
