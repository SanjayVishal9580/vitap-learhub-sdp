const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Paper = require('../models/Paper');
const Course = require('../models/Course');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST /api/papers
router.post('/', protect, authorize('teacher'), upload.single('paper'), async (req, res) => {
  try {
    const { courseId, examCategory, year, description } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Please upload a file' });

    const fileBuffer = req.file.buffer || Buffer.from(req.file.path);
    const fileHash = crypto.createHash('sha256').update(req.file.path + req.file.originalname + courseId).digest('hex');

    const duplicate = await Paper.findOne({ fileHash });
    if (duplicate) {
      return res.status(400).json({
        message: 'This paper already exists (duplicate detected)',
        originalUploader: duplicate.uploadedBy,
        uploadedAt: duplicate.createdAt,
      });
    }

    const paper = await Paper.create({
      courseId, examCategory, year: parseInt(year),
      fileUrl: req.file.path, fileName: req.file.originalname,
      fileHash, uploadedBy: req.user._id,
      description: description || '', status: 'pending',
    });

    res.status(201).json({ message: 'Paper submitted for review', paper });
  } catch (error) {
    console.error('Paper upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/papers/course/:courseId
router.get('/course/:courseId', protect, async (req, res) => {
  try {
    const papers = await Paper.find({ courseId: req.params.courseId, status: 'approved' })
      .populate('uploadedBy', 'name')
      .sort({ examCategory: 1, year: -1 });
    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/papers/pending
router.get('/pending', protect, authorize('admin'), async (req, res) => {
  try {
    const papers = await Paper.find({ status: 'pending' })
      .populate('uploadedBy', 'name email')
      .populate('courseId', 'courseCode courseName')
      .sort({ createdAt: -1 });
    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/papers/all
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    const papers = await Paper.find()
      .populate('uploadedBy', 'name email')
      .populate('courseId', 'courseCode courseName')
      .sort({ createdAt: -1 });
    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/papers/:id/approve
router.put('/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });
    paper.status = 'approved';
    paper.reviewedBy = req.user._id;
    paper.reviewedAt = new Date();
    await paper.save();
    res.json({ message: 'Paper approved', paper });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/papers/:id/reject
router.put('/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });
    paper.status = 'rejected';
    paper.rejectReason = req.body.reason || '';
    paper.reviewedBy = req.user._id;
    paper.reviewedAt = new Date();
    await paper.save();
    res.json({ message: 'Paper rejected', paper });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
