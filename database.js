import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../../night-hours.json');

function readDB() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return { users: [], gameStats: [], badges: [], sessionRequests: [] };
  }
}

function writeDB(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

const db = {
  users: {
    findByEmail: (email) => {
      const data = readDB();
      return data.users.find(u => u.email === email) || null;
    },
    findById: (id) => {
      const data = readDB();
      return data.users.find(u => u.id === id) || null;
    },
    create: (user) => {
      const data = readDB();
      const newUser = { id: Date.now(), createdAt: new Date().toISOString(), ...user };
      data.users.push(newUser);
      writeDB(data);
      return newUser;
    },
    update: (id, updates) => {
      const data = readDB();
      const idx = data.users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      data.users[idx] = { ...data.users[idx], ...updates };
      writeDB(data);
      return data.users[idx];
    }
  },
  gameStats: {
    find: (userId, gameKey) => {
      const data = readDB();
      return data.gameStats.find(s => s.userId === userId && s.gameKey === gameKey) || null;
    },
    findAllByUser: (userId) => {
      const data = readDB();
      return data.gameStats.filter(s => s.userId === userId);
    },
    upsert: (userId, gameKey, { score, streak, highScore }) => {
      const data = readDB();
      const idx = data.gameStats.findIndex(s => s.userId === userId && s.gameKey === gameKey);
      let highScores = [];
      if (idx !== -1) {
        highScores = data.gameStats[idx].highScores || [];
        data.gameStats[idx].gamesPlayed = (data.gameStats[idx].gamesPlayed || 0) + 1;
        data.gameStats[idx].totalScore = (data.gameStats[idx].totalScore || 0) + score;
        data.gameStats[idx].bestStreak = Math.max(data.gameStats[idx].bestStreak || 0, streak);
      } else {
        data.gameStats.push({
          userId,
          gameKey,
          gamesPlayed: 1,
          totalScore: score,
          bestStreak: streak,
          highScores: []
        });
      }
      if (typeof highScore === 'number') {
        highScores.push({ score: highScore, streak, date: new Date().toISOString() });
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, 10);
      }
      if (idx !== -1) {
        data.gameStats[idx].highScores = highScores;
      } else {
        data.gameStats[data.gameStats.length - 1].highScores = highScores;
      }
      writeDB(data);
      return data.gameStats[idx !== -1 ? idx : data.gameStats.length - 1];
    }
  },
  badges: {
    findByUser: (userId) => {
      const data = readDB();
      return data.badges.filter(b => b.userId === userId);
    },
    create: (userId, badgeKey) => {
      const data = readDB();
      const exists = data.badges.some(b => b.userId === userId && b.badgeKey === badgeKey);
      if (exists) return null;
      const badge = { userId, badgeKey, earnedAt: new Date().toISOString() };
      data.badges.push(badge);
      writeDB(data);
      return badge;
    }
  },
  sessionRequests: {
    create: (request) => {
      const data = readDB();
      data.sessionRequests.unshift(request);
      writeDB(data);
      return request;
    },
    findByUser: (userId) => {
      const data = readDB();
      return data.sessionRequests.filter(r => r.userId === userId);
    },
    findAll: () => {
      const data = readDB();
      return data.sessionRequests;
    },
    updateStatus: (id, status) => {
      const data = readDB();
      const idx = data.sessionRequests.findIndex(r => r.id === id);
      if (idx !== -1) {
        data.sessionRequests[idx].status = status;
        writeDB(data);
        return data.sessionRequests[idx];
      }
      return null;
    }
  },
  leaderboard: {
    get: (gameKey, limit = 10) => {
      const data = readDB();
      const stats = data.gameStats
        .filter(s => s.gameKey === gameKey)
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .slice(0, limit);
      return stats.map(s => {
        const user = data.users.find(u => u.id === s.userId);
        return { ...s, user: user ? { name: user.name, avatar: user.avatar } : null };
      });
    }
  }
};

export default db;