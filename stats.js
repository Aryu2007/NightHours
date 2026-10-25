import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', (req, res) => {
  const stats = db.gameStats.findAllByUser(req.user.id);
  const badges = db.badges.findByUser(req.user.id);

  res.json({
    stats: stats.reduce((acc, s) => {
      acc[s.gameKey] = {
        gamesPlayed: s.gamesPlayed,
        totalScore: s.totalScore,
        bestStreak: s.bestStreak,
        highScores: s.highScores || []
      };
      return acc;
    }, {}),
    badges: badges.map(b => b.badgeKey)
  });
});

router.post('/game/:gameKey', (req, res) => {
  try {
    const { gameKey } = req.params;
    const { score, streak, highScore } = req.body;

    if (typeof score !== 'number' || typeof streak !== 'number') {
      return res.status(400).json({ error: 'Score and streak are required' });
    }

    const updated = db.gameStats.upsert(req.user.id, gameKey, { score, streak, highScore });

    checkAndAwardBadges(req.user.id);

    const allStats = db.gameStats.findAllByUser(req.user.id);
    const badges = db.badges.findByUser(req.user.id);

    res.json({
      stats: {
        [gameKey]: {
          gamesPlayed: updated.gamesPlayed,
          totalScore: updated.totalScore,
          bestStreak: updated.bestStreak,
          highScores: updated.highScores || []
        }
      },
      badges: badges.map(b => b.badgeKey)
    });
  } catch (err) {
    console.error('Stats update error:', err);
    res.status(500).json({ error: 'Failed to update stats' });
  }
});

function checkAndAwardBadges(userId) {
  const userStats = db.gameStats.findAllByUser(userId);
  const totalGames = userStats.reduce((sum, s) => sum + (s.gamesPlayed || 0), 0);
  const totalScore = userStats.reduce((sum, s) => sum + (s.totalScore || 0), 0);
  const gameStreaks = userStats.map(s => ({ gameKey: s.gameKey, bestStreak: s.bestStreak }));

  const existingBadges = new Set(db.badges.findByUser(userId).map(b => b.badgeKey));

  const badgeChecks = [
    { key: 'veteran', condition: totalGames >= 10 },
    { key: 'legend', condition: totalGames >= 50 },
    { key: 'scorer', condition: totalScore >= 1000 },
    { key: 'master', condition: totalScore >= 5000 },
    { key: 'streaker', condition: gameStreaks.some(s => s.bestStreak >= 10) },
    { key: 'completionist', condition: gameStreaks.length >= 5 && gameStreaks.every(s => s.bestStreak > 0) }
  ];

  for (const badge of badgeChecks) {
    if (badge.condition && !existingBadges.has(badge.key)) {
      db.badges.create(userId, badge.key);
    }
  }
}

router.get('/leaderboard/:gameKey', (req, res) => {
  const { gameKey } = req.params;
  const limit = parseInt(req.query.limit) || 10;

  const leaderboard = db.leaderboard.get(gameKey, limit);

  res.json({ leaderboard });
});

export default router;