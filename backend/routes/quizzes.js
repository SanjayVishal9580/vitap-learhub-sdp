const express = require('express');
const router = express.Router();
const Topic = require('../models/Topic');
const Enrollment = require('../models/Enrollment');
const QuizAttempt = require('../models/QuizAttempt');
const { protect, authorize } = require('../middleware/auth');
const { generateQuiz, generateTeacherRecommendations } = require('../services/geminiService');
const { calculateXP, updateUserProgress } = require('../services/xpService');

// ============================================================================
// QUIZ ROUTES - Production Ready
// Comprehensive error handling and validation for quiz generation and submission
// ============================================================================

/**
 * POST /api/quizzes/generate
 * Generate a new quiz based on topic context
 */
router.post('/generate', protect, authorize('student'), async (req, res) => {
  try {
    const { topicId } = req.body;

    if (!topicId) {
      return res.status(400).json({
        message: 'Topic ID is required',
      });
    }

    // Fetch topic with error handling
    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        message: 'Topic not found',
      });
    }

    // Check if quiz is enabled
    if (!topic.enableQuiz) {
      return res.status(400).json({
        message: 'Quiz is not enabled for this topic',
      });
    }

    // Validate required topic fields
    if (!topic.topicName || !topic.quizContext) {
      return res.status(400).json({
        message: 'Topic is not properly configured for quizzes',
      });
    }

    // Get previous attempts for difficulty adjustment
    const prevAttempts = await QuizAttempt.find({
      studentId: req.user._id,
      topicId: topicId,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    const previousScores = prevAttempts.map(a => `${a.score}/${a.totalQuestions}`);

    // Determine difficulty based on performance
    let difficulty = 'MEDIUM';
    if (prevAttempts.length > 0) {
      const lastScore = prevAttempts[0].score / prevAttempts[0].totalQuestions;
      if (lastScore >= 0.8) {
        difficulty = 'HARD';
      } else if (lastScore < 0.5) {
        difficulty = 'EASY';
      }
    }

    console.log(`[QUIZ] Generating for ${topic.topicName} (${difficulty})`);

    // Generate quiz questions
    const questions = await generateQuiz({
      topicName: topic.topicName,
      quizContext: topic.quizContext,
      difficulty: difficulty,
      questionCount: 10,
      previousScores: previousScores,
    });

    // Return quiz with metadata
    res.json({
      success: true,
      questions: questions,
      difficulty: difficulty,
      topicName: topic.topicName,
      totalQuestions: questions.length,
      timestamp: new Date(),
    });

  } catch (error) {
    console.error('[QUIZ] Generation error:', error.message);

    // Rate limiting or service unavailable
    if (error.message.includes('rate') || error.message.includes('temporarily')) {
      return res.status(503).json({
        message: 'Quiz service is temporarily unavailable. Please try again in a moment.',
        error: error.message,
      });
    }

    res.status(500).json({
      message: error.message || 'Failed to generate quiz',
      error: error.message,
    });
  }
});

/**
 * POST /api/quizzes/submit
 * Submit completed quiz and record results
 */
router.post('/submit', protect, authorize('student'), async (req, res) => {
  try {
    const {
      topicId,
      courseId,
      teacherId,
      questions,
      tabSwitches = 0,
      fullscreenExits = 0,
      timeTaken = 0,
      isPractice = false,
    } = req.body;

    // Validate required fields
    if (!topicId || !courseId || !teacherId || !Array.isArray(questions)) {
      return res.status(400).json({
        message: 'Missing required quiz submission data',
      });
    }

    if (questions.length === 0) {
      return res.status(400).json({
        message: 'No questions to submit',
      });
    }

    // Validate question structure - only require correctAnswer, studentAnswer can be empty (for violation submissions)
    const invalidQuestions = questions.filter(q => !q.correctAnswer);
    if (invalidQuestions.length > 0) {
      return res.status(400).json({
        message: 'Some questions have invalid data',
      });
    }

    // Calculate score
    let score = 0;
    const graded = questions.map(q => {
      const isCorrect = String(q.studentAnswer).trim() === String(q.correctAnswer).trim();
      if (isCorrect) score++;
      return {
        ...q,
        isCorrect: isCorrect,
      };
    });

    const totalQuestions = questions.length;
    const passed = score >= Math.ceil(totalQuestions * 0.5); // 50% pass rate

    // Check for suspicious activity
    let flagged = false;
    let flagReason = '';

    if (tabSwitches > 2 || fullscreenExits > 2) {
      flagged = true;
      const reasons = [];
      if (tabSwitches > 2) reasons.push(`Tab switches: ${tabSwitches}`);
      if (fullscreenExits > 2) reasons.push(`Fullscreen exits: ${fullscreenExits}`);
      flagReason = reasons.join('; ');
    }

    // Check for unusually fast completion (less than 30 seconds with high score)
    if (timeTaken < 30 && score >= totalQuestions * 0.9) {
      flagged = true;
      flagReason = (flagReason ? flagReason + '; ' : '') + `Suspiciously fast: ${timeTaken}s`;
    }

    // Determine difficulty from questions
    const difficulty = questions[0]?.difficulty || 'MEDIUM';

    // Calculate XP awarded
    const xpAwarded = !isPractice && passed && !flagged
      ? calculateXP(score, totalQuestions, difficulty)
      : 0;

    // Create quiz attempt record
    const attempt = await QuizAttempt.create({
      studentId: req.user._id,
      courseId: courseId,
      teacherId: teacherId,
      topicId: topicId,
      questions: graded,
      score: score,
      totalQuestions: totalQuestions,
      difficulty: difficulty,
      xpAwarded: xpAwarded,
      tabSwitches: tabSwitches,
      fullscreenExits: fullscreenExits,
      timeTaken: timeTaken,
      flagged: flagged,
      flagReason: flagReason,
      status: flagged ? 'SUSPICIOUS' : passed ? 'PASSED' : 'FAILED',
      isPractice: isPractice,
    });

    let progressUpdate = null;

    // Update progress only if not practice, passed, and not flagged
    if (!isPractice && passed && !flagged) {
      progressUpdate = await updateUserProgress(req.user._id, xpAwarded);

      // Update enrollment
      const enrollment = await Enrollment.findOne({
        studentId: req.user._id,
        courseId: courseId,
        teacherId: teacherId,
      });

      if (enrollment) {
        const existingTopic = enrollment.completedTopics.find(
          t => t.topicId.toString() === topicId
        );

        if (existingTopic) {
          existingTopic.attempts += 1;
          if (score > existingTopic.bestScore) {
            existingTopic.bestScore = score;
          }
        } else {
          enrollment.completedTopics.push({
            topicId: topicId,
            bestScore: score,
            attempts: 1,
          });
        }
        await enrollment.save();
      }
    }

    console.log(
      `[QUIZ] Submitted: ${req.user._id} scored ${score}/${totalQuestions} on ${topicId}`
    );

    res.json({
      success: true,
      attempt: attempt,
      passed: passed,
      score: score,
      totalQuestions: totalQuestions,
      xpAwarded: xpAwarded,
      flagged: flagged,
      progressUpdate: progressUpdate,
    });

  } catch (error) {
    console.error('[QUIZ] Submission error:', error.message);

    res.status(500).json({
      message: error.message || 'Failed to submit quiz',
      error: error.message,
    });
  }
});

/**
 * GET /api/quizzes/history/:topicId
 * Get quiz attempt history for a topic
 */
router.get('/history/:topicId', protect, async (req, res) => {
  try {
    const { topicId } = req.params;

    const attempts = await QuizAttempt.find({
      studentId: req.user._id,
      topicId: topicId,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      attempts: attempts,
      total: attempts.length,
    });

  } catch (error) {
    console.error('[QUIZ] History error:', error.message);

    res.status(500).json({
      message: 'Failed to load quiz history',
      error: error.message,
    });
  }
});

/**
 * GET /api/quizzes/flagged
 * Get flagged quiz attempts (admin only)
 */
router.get('/flagged', protect, authorize('admin'), async (req, res) => {
  try {
    const flagged = await QuizAttempt.find({ flagged: true })
      .populate('studentId', 'name email')
      .populate('courseId', 'courseCode courseName')
      .populate('topicId', 'topicName')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      flagged: flagged,
      total: flagged.length,
    });

  } catch (error) {
    console.error('[QUIZ] Flagged retrieval error:', error.message);

    res.status(500).json({
      message: 'Failed to load flagged quizzes',
      error: error.message,
    });
  }
});

/**
 * PUT /api/quizzes/:id/invalidate
 * Invalidate a quiz attempt (admin only)
 */
router.put('/:id/invalidate', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const attempt = await QuizAttempt.findById(id);
    if (!attempt) {
      return res.status(404).json({
        message: 'Quiz attempt not found',
      });
    }

    attempt.status = 'INVALIDATED';
    attempt.xpAwarded = 0;
    await attempt.save();

    console.log(`[QUIZ] Invalidated attempt ${id}`);

    res.json({
      message: 'Quiz invalidated successfully',
      attempt: attempt,
    });

  } catch (error) {
    console.error('[QUIZ] Invalidate error:', error.message);

    res.status(500).json({
      message: 'Failed to invalidate quiz',
      error: error.message,
    });
  }
});

module.exports = router;
