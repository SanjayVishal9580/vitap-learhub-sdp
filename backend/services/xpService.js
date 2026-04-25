const User = require('../models/User');

/**
 * Calculate XP based on quiz score and difficulty
 */
const calculateXP = (score, totalQuestions, difficulty) => {
  const baseXP = Math.round((score / totalQuestions) * 20);
  const multiplier = {
    EASY: 1,
    MEDIUM: 1.5,
    HARD: 2,
  };
  return Math.round(baseXP * (multiplier[difficulty] || 1));
};

/**
 * Update user's XP, level, and streak
 */
const updateUserProgress = async (userId, xpEarned) => {
  const user = await User.findById(userId);
  if (!user) return null;

  // Add XP
  user.xp += xpEarned;

  // Recalculate level (every 100 XP = 1 level)
  user.level = Math.floor(user.xp / 100) + 1;

  // Update streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (user.lastStudyDate) {
    const lastStudy = new Date(user.lastStudyDate);
    lastStudy.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - lastStudy) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      user.streak += 1;
    } else if (diffDays > 1) {
      user.streak = 1;
    }
    // If diffDays === 0, same day, keep streak
  } else {
    user.streak = 1;
  }

  user.lastStudyDate = new Date();
  user.totalQuizzes += 1;
  user.totalScore += xpEarned;
  user.topicsCompleted += 1;

  // Check for achievements
  const newAchievements = checkAchievements(user);
  if (newAchievements.length > 0) {
    user.achievements.push(...newAchievements);
  }

  await user.save();

  return {
    xp: user.xp,
    level: user.level,
    streak: user.streak,
    newAchievements,
  };
};

/**
 * Check and award achievements
 */
const checkAchievements = (user) => {
  const newAchievements = [];
  const existingNames = user.achievements.map(a => a.name);

  const achievementList = [
    { name: 'First Steps', description: 'Complete your first quiz', icon: '🎯', condition: () => user.totalQuizzes >= 1 },
    { name: 'Getting Warmed Up', description: 'Complete 5 quizzes', icon: '🔥', condition: () => user.totalQuizzes >= 5 },
    { name: 'Quiz Master', description: 'Complete 20 quizzes', icon: '🏆', condition: () => user.totalQuizzes >= 20 },
    { name: 'Streak Starter', description: 'Maintain a 3-day streak', icon: '⚡', condition: () => user.streak >= 3 },
    { name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '💪', condition: () => user.streak >= 7 },
    { name: 'Level Up!', description: 'Reach Level 2', icon: '⬆️', condition: () => user.level >= 2 },
    { name: 'Rising Star', description: 'Reach Level 5', icon: '⭐', condition: () => user.level >= 5 },
    { name: 'XP Hunter', description: 'Earn 500 XP', icon: '💎', condition: () => user.xp >= 500 },
    { name: 'Scholar', description: 'Complete 10 topics', icon: '📚', condition: () => user.topicsCompleted >= 10 },
  ];

  for (const achievement of achievementList) {
    if (!existingNames.includes(achievement.name) && achievement.condition()) {
      newAchievements.push({
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        earnedAt: new Date(),
      });
    }
  }

  return newAchievements;
};

module.exports = { calculateXP, updateUserProgress, checkAchievements };
