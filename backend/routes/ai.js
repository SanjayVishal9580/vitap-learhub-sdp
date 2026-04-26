const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const { askAITutor } = require('../services/geminiService');

const AITutorSession = require('../models/AITutorSession');
const Topic = require('../models/Topic');

// Helper to check if a string is a valid MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;

// @route   GET /api/ai/test-connection
// @desc    Test if Gemini AI is working and the API key is valid
router.get('/test-connection', async (req, res) => {
  try {
    const { askAITutor } = require('../services/geminiService');
    const response = await askAITutor({
      topicName: 'Testing',
      question: 'Respond with the word "OK" if you can hear me.'
    });
    res.json({ 
      success: true, 
      message: 'Gemini AI is connected!', 
      response,
      keyPreview: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 8)}...` : 'MISSING'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      keyPreview: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 8)}...` : 'MISSING'
    });
  }
});

// @route   GET /api/ai/tutor/history/:topicId
router.get('/tutor/history/:topicId', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.topicId)) {
      return res.json([]); // Return empty history for non-ObjectId (e.g. 'general')
    }
    const session = await AITutorSession.findOne({
      studentId: req.user._id,
      topicId: req.params.topicId
    });
    res.json(session ? session.history : []);
  } catch (error) {
    console.error('AI History Error:', error.message);
    res.status(500).json({ message: 'Failed to load chat history' });
  }
});

// @route   POST /api/ai/tutor
router.post('/tutor', protect, async (req, res) => {
  try {
    const { topicId, topicName, quizContext, question } = req.body;
    if (!question) return res.status(400).json({ message: 'Please provide a question' });

    // Call AI regardless of whether topicId is valid
    const validTopicId = topicId && isValidObjectId(topicId);

    // Fetch existing history only if we have a valid topicId
    let chatHistory = [];
    let session = null;
    if (validTopicId) {
      session = await AITutorSession.findOne({ studentId: req.user._id, topicId });
      if (session) {
        chatHistory = session.history.map(h => ({ role: h.role, content: h.content }));
      }
    }

    const response = await askAITutor({
      topicName: topicName || 'General Computer Science',
      quizContext: quizContext || '',
      question,
      chatHistory,
    });

    // Save interaction to history only if we have a valid topicId
    if (validTopicId) {
      if (!session) {
        session = new AITutorSession({ studentId: req.user._id, topicId, history: [] });
      }
      session.history.push({ role: 'user', content: question });
      session.history.push({ role: 'model', content: response });
      await session.save();
    }

    res.json({ response });
  } catch (error) {
    console.error('AI Tutor Route Error:', error.message);
    res.status(500).json({ message: error.message || 'AI Tutor error' });
  }
});

module.exports = router;
