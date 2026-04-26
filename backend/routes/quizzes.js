const express = require('express');
const router = express.Router();
const Topic = require('../models/Topic');
const Enrollment = require('../models/Enrollment');
const QuizAttempt = require('../models/QuizAttempt');
const { protect, authorize } = require('../middleware/auth');
const { generateQuiz } = require('../services/geminiService');
const { calculateXP, updateUserProgress } = require('../services/xpService');

// @route   POST /api/quizzes/generate
router.post('/generate', protect, authorize('student'), async (req, res) => {
  try {
    const { topicId } = req.body;
    const topic = await Topic.findById(topicId);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    if (!topic.enableQuiz) return res.status(400).json({ message: 'Quiz not enabled for this topic' });

    const prevAttempts = await QuizAttempt.find({ studentId: req.user._id, topicId }).sort({ createdAt: -1 }).limit(5);
    const previousScores = prevAttempts.map(a => `${a.score}/${a.totalQuestions}`);
    let difficulty = 'MEDIUM';
    if (prevAttempts.length > 0) {
      const lastScore = prevAttempts[0].score / prevAttempts[0].totalQuestions;
      if (lastScore >= 0.8) difficulty = 'HARD';
      else if (lastScore < 0.5) difficulty = 'EASY';
    }

    const questions = await generateQuiz({
      topicName: topic.topicName,
      quizContext: topic.quizContext,
      difficulty,
      questionCount: 10,
      previousScores,
    });

    res.json({ questions, difficulty, topicName: topic.topicName });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate quiz' });
  }
});

// @route   POST /api/quizzes/submit
router.post('/submit', protect, authorize('student'), async (req, res) => {
  try {
    const { topicId, courseId, teacherId, questions, tabSwitches, fullscreenExits, timeTaken, isPractice } = req.body;

    let score = 0;
    const graded = questions.map(q => {
      const isCorrect = q.studentAnswer === q.correctAnswer;
      if (isCorrect) score++;
      return { ...q, isCorrect };
    });

    const passed = score >= 5;
    let flagged = false;
    let flagReason = '';
    if (tabSwitches > 1 || fullscreenExits > 1 || (timeTaken < 60 && score >= 8)) {
      flagged = true;
      const reasons = [];
      if (tabSwitches > 1) reasons.push(`Tab switches: ${tabSwitches}`);
      if (fullscreenExits > 1) reasons.push(`Fullscreen exits: ${fullscreenExits}`);
      if (timeTaken < 60 && score >= 8) reasons.push(`Suspiciously fast: ${timeTaken}s`);
      flagReason = reasons.join('; ');
    }

    const difficulty = questions[0]?.difficulty || 'MEDIUM';
    const xpAwarded = (!isPractice && passed && !flagged) ? calculateXP(score, 10, difficulty) : 0;

    const attempt = await QuizAttempt.create({
      studentId: req.user._id, courseId, teacherId, topicId,
      questions: graded, score, totalQuestions: 10, difficulty,
      xpAwarded, tabSwitches: tabSwitches || 0, fullscreenExits: fullscreenExits || 0,
      timeTaken: timeTaken || 0, flagged, flagReason,
      status: flagged ? 'SUSPICIOUS' : (passed ? 'PASSED' : 'FAILED'),
      isPractice: isPractice || false,
    });

    let progressUpdate = null;
    if (!isPractice && passed && !flagged) {
      progressUpdate = await updateUserProgress(req.user._id, xpAwarded);
      const enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId, teacherId });
      if (enrollment) {
        const existing = enrollment.completedTopics.find(t => t.topicId.toString() === topicId);
        if (existing) {
          existing.attempts += 1;
          if (score > existing.bestScore) existing.bestScore = score;
        } else {
          enrollment.completedTopics.push({ topicId, bestScore: score, attempts: 1 });
        }
        await enrollment.save();
      }
    }

    res.json({ attempt, passed, score, xpAwarded, progressUpdate });
  } catch (error) {
    console.error('Quiz submit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/quizzes/history/:topicId
router.get('/history/:topicId', protect, async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({
      studentId: req.user._id, topicId: req.params.topicId,
    }).sort({ createdAt: -1 });
    res.json(attempts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/quizzes/flagged
router.get('/flagged', protect, authorize('admin'), async (req, res) => {
  try {
    const flagged = await QuizAttempt.find({ flagged: true })
      .populate('studentId', 'name email')
      .populate('courseId', 'courseCode courseName')
      .populate('topicId', 'topicName')
      .sort({ createdAt: -1 });
    res.json(flagged);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/quizzes/:id/invalidate
router.put('/:id/invalidate', protect, authorize('admin'), async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.id);
    if (!attempt) return res.status(404).json({ message: 'Not found' });
    attempt.status = 'INVALIDATED';
    attempt.xpAwarded = 0;
    await attempt.save();
    res.json({ message: 'Quiz invalidated', attempt });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
