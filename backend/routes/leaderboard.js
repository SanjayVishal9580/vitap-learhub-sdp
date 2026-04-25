const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/leaderboard
router.get('/', protect, async (req, res) => {
  try {
    const leaders = await User.find({ role: 'student' })
      .select('name email avatar xp level streak topicsCompleted')
      .sort({ xp: -1 })
      .limit(50);

    const userRank = await User.countDocuments({
      role: 'student',
      xp: { $gt: req.user.xp || 0 },
    });

    res.json({ leaders, userRank: userRank + 1 });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
