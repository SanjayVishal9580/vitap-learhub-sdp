const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const { askAITutor } = require('../services/geminiService');

const AITutorSession = require('../models/AITutorSession');
const Topic = require('../models/Topic');

// ============================================================================
// AI TUTOR ROUTES - Production Ready
// ============================================================================

/**
 * Helper to validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) &&
    String(new mongoose.Types.ObjectId(id)) === id;
};

/**
 * GET /api/ai/tutor/history/:topicId
 * Retrieve chat history for a specific topic
 */
router.get('/tutor/history/:topicId', protect, async (req, res) => {
  try {
    const { topicId } = req.params;
    
    // Return empty array for non-ObjectId (e.g., 'general')
    if (!isValidObjectId(topicId)) {
      return res.json([]);
    }

    const session = await AITutorSession.findOne({
      studentId: req.user._id,
      topicId: topicId,
    });

    const history = session
      ? session.history.map(h => ({
          role: h.role,
          content: h.content,
          timestamp: h.createdAt,
        }))
      : [];

    res.json(history);
  } catch (error) {
    console.error('[AI] History retrieval error:', error.message);
    res.status(500).json({
      message: 'Failed to load chat history',
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/tutor
 * Ask AI tutor a question and get response with history management
 */
router.post('/tutor', protect, async (req, res) => {
  try {
    const { topicId, topicName, quizContext, question } = req.body;

    // Validate required fields
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        message: 'Question is required and must be a string',
      });
    }

    if (question.trim().length === 0) {
      return res.status(400).json({
        message: 'Please provide a non-empty question',
      });
    }

    if (question.length > 5000) {
      return res.status(400).json({
        message: 'Question is too long (max 5000 characters)',
      });
    }

    // Prepare parameters
    const validTopicId = topicId && isValidObjectId(topicId);
    let chatHistory = [];
    let session = null;

    // Load existing session only if we have a valid topicId
    if (validTopicId) {
      session = await AITutorSession.findOne({
        studentId: req.user._id,
        topicId: topicId,
      });

      if (session && Array.isArray(session.history)) {
        chatHistory = session.history
          .map(h => ({
            role: h.role || 'user',
            content: h.content || '',
          }))
          .filter(h => h.content);
      }
    }

    // Call AI tutor
    console.log(`[AI] Processing question for ${topicName || 'General'}`);
    const response = await askAITutor({
      topicName: topicName || 'General',
      quizContext: quizContext || '',
      question: question.trim(),
      chatHistory: chatHistory,
    });

    // Save to history if valid topicId
    if (validTopicId) {
      if (!session) {
        session = new AITutorSession({
          studentId: req.user._id,
          topicId: topicId,
          history: [],
        });
      }

      // Add messages to history (limit to 50 messages for storage)
      if (!Array.isArray(session.history)) {
        session.history = [];
      }

      session.history.push(
        { role: 'user', content: question.trim() },
        { role: 'model', content: response }
      );

      // Keep only last 50 messages
      if (session.history.length > 50) {
        session.history = session.history.slice(-50);
      }

      await session.save();
      console.log(`[AI] Saved history for topic ${topicId}`);
    }

    res.json({
      response: response,
      topicName: topicName || 'General',
      timestamp: new Date(),
    });

  } catch (error) {
    console.error('[AI] Request error:', error.message);
    
    // Specific error handling
    if (error.message.includes('rate')) {
      return res.status(429).json({
        message: 'Too many requests. Please wait a moment before trying again.',
        error: error.message,
      });
    }

    if (error.message.includes('API')) {
      return res.status(503).json({
        message: 'AI service is temporarily unavailable. Please try again later.',
        error: error.message,
      });
    }

    res.status(500).json({
      message: error.message || 'Failed to process question',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/ai/tutor/history/:topicId
 * Clear chat history for a topic
 */
router.delete('/tutor/history/:topicId', protect, async (req, res) => {
  try {
    const { topicId } = req.params;

    if (!isValidObjectId(topicId)) {
      return res.status(400).json({ message: 'Invalid topic ID' });
    }

    const result = await AITutorSession.deleteOne({
      studentId: req.user._id,
      topicId: topicId,
    });

    res.json({
      message: 'History cleared',
      deleted: result.deletedCount > 0,
    });
  } catch (error) {
    console.error('[AI] Delete history error:', error.message);
    res.status(500).json({
      message: 'Failed to clear history',
      error: error.message,
    });
  }
});

module.exports = router;
