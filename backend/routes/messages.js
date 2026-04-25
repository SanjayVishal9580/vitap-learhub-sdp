const express = require('express');
const router = express.Router();
const AdminMessage = require('../models/AdminMessage');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/messages/admin
// @desc    Send a message to admin
// @access  Private
router.post('/admin', protect, async (req, res) => {
  try {
    const { subject, content } = req.body;
    
    if (!subject || !content) {
      return res.status(400).json({ message: 'Subject and content are required' });
    }

    const adminMessage = await AdminMessage.create({
      senderId: req.user._id,
      subject,
      content,
    });

    res.status(201).json({ message: 'Message sent to admin successfully', adminMessage });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/admin/my
// @desc    Get my messages to admin
// @access  Private
router.get('/admin/my', protect, async (req, res) => {
  try {
    const messages = await AdminMessage.find({ senderId: req.user._id }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/admin/all
// @desc    Get all messages to admin (Admin only)
// @access  Private/Admin
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    const messages = await AdminMessage.find()
      .populate('senderId', 'name email role avatar')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/messages/admin/:id/reply
// @desc    Reply to a message (Admin only)
// @access  Private/Admin
router.put('/admin/:id/reply', protect, authorize('admin'), async (req, res) => {
  try {
    const { adminReply, status } = req.body;
    
    const message = await AdminMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.adminReply = adminReply || message.adminReply;
    message.status = status || 'replied';
    message.repliedAt = Date.now();
    
    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
