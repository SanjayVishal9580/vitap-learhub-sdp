const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// @route   POST /api/groups
router.post('/', protect, async (req, res) => {
  try {
    const { name, maxMembers, courseId } = req.body;
    const passcode = 'GRP_' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const group = await Group.create({
      name, passcode, courseId: courseId || null,
      createdBy: req.user._id, adminId: req.user._id,
      members: [{ userId: req.user._id }],
      maxMembers: maxMembers || 5,
    });
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/groups/join
router.post('/join', protect, async (req, res) => {
  try {
    const { passcode } = req.body;
    const group = await Group.findOne({ passcode });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.members.length >= group.maxMembers) return res.status(400).json({ message: 'Group is full' });
    const alreadyMember = group.members.some(m => m.userId.toString() === req.user._id.toString());
    if (alreadyMember) return res.status(400).json({ message: 'Already a member' });
    group.members.push({ userId: req.user._id });
    await group.save();
    res.json({ message: 'Joined successfully', group });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/groups/my
router.get('/my', protect, async (req, res) => {
  try {
    const groups = await Group.find({ 'members.userId': req.user._id })
      .populate('members.userId', 'name email avatar')
      .populate('adminId', 'name');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/groups/:id/messages
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const messages = await Message.find({ groupId: req.params.id })
      .sort({ createdAt: -1 }).limit(100);
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

const upload = require('../middleware/upload');

// Wrap multer upload
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: `Upload failed: ${err.message}` });
    next();
  });
};

// @route   POST /api/groups/:id/messages
router.post('/:id/messages', protect, async (req, res) => {
  try {
    const { content, type } = req.body;
    const message = await Message.create({
      groupId: req.params.id, senderId: req.user._id,
      senderName: req.user.name, content, type: type || 'text',
    });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/groups/:id/messages/file
router.post('/:id/messages/file', protect, handleUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    // Determine type (image or video)
    const mimeType = req.file.mimetype;
    let type = 'file';
    if (mimeType.startsWith('image/')) type = 'image';
    if (mimeType.startsWith('video/')) type = 'video';

    const message = await Message.create({
      groupId: req.params.id, 
      senderId: req.user._id,
      senderName: req.user.name, 
      content: req.body.content || 'Shared a file', 
      type,
      fileUrl: req.file.path,
      fileName: req.file.originalname
    });
    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/groups/:id/leave
router.delete('/:id/leave', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    group.members = group.members.filter(m => m.userId.toString() !== req.user._id.toString());
    if (group.adminId.toString() === req.user._id.toString() && group.members.length > 0) {
      group.adminId = group.members[0].userId;
    }
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Group deleted (no members left)' });
    }
    await group.save();
    res.json({ message: 'Left group' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
