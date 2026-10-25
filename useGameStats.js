import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { statsApi } from '../services/api';

const STORAGE_KEY = 'night-hours-stats';

function createEmptyGameStat() {
  return {
    gamesPlayed: 0,
    totalScore: 0,
    bestStreak: 0,
    highScores: []
  };
}

export function readLocalStatsMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    // Normalize legacy flat schema ({ gamesPlayed, totalScore, bestStreaks }) if present
    if ('bestStreaks' in parsed && typeof parsed.bestStreaks === 'object') {
      const normalized = {};
      Object.entries(parsed.bestStreaks).forEach(([key, streak]) => {
        normalized[key] = {
          gamesPlayed: streak > 0 ? 1 : 0,
          totalScore: 0,
          bestStreak: Number(streak) || 0,
          highScores: []
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }

    return parsed;
  } catch {
    return {};
  }
}

export function useGameStats(gameKey) {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(createEmptyGameStat);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        const data = await statsApi.getAll();
        setStats(data.stats?.[gameKey] || createEmptyGameStat());
      } else {
        const allStats = readLocalStatsMap();
        setStats(allStats[gameKey] || createEmptyGameStat());
      }
    } catch (err) {
      console.error('Failed to load game stats:', err);
      const allStats = readLocalStatsMap();
      setStats(allStats[gameKey] || createEmptyGameStat());
    } finally {
      setLoading(false);
    }
  }, [user, gameKey]);

  useEffect(() => {
    if (!authLoading) {
      loadStats();
    }
  }, [authLoading, loadStats]);

  const updateStats = useCallback(async (score, streak, highScore = score) => {
    const numericScore = Number(score) || 0;
    const numericStreak = Number(streak) || 0;
    const numericHighScore = typeof highScore === 'number' ? highScore : numericScore;

    setStats((prev) => {
      const current = prev || createEmptyGameStat();
      const updatedHighScores = [...(current.highScores || [])];
      updatedHighScores.push({
        score: numericHighScore,
        streak: numericStreak,
        date: new Date().toISOString()
      });
      updatedHighScores.sort((a, b) => b.score - a.score);

      const nextStats = {
        gamesPlayed: (current.gamesPlayed || 0) + 1,
        totalScore: (current.totalScore || 0) + numericScore,
        bestStreak: Math.max(current.bestStreak || 0, numericStreak),
        highScores: updatedHighScores.slice(0, 10)
      };

      const allStats = readLocalStatsMap();
      allStats[gameKey] = nextStats;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allStats));
      return nextStats;
    });

    if (!user) return;

    try {
      const data = await statsApi.updateGame(gameKey, {
        score: numericScore,
        streak: numericStreak,
        highScore: numericHighScore
      });
      if (data.stats?.[gameKey]) {
        setStats(data.stats[gameKey]);
      }
      if (data.badges) {
        window.dispatchEvent(new CustomEvent('badges-updated', { detail: data.badges }));
      }
    } catch (err) {
      console.error('Failed to update stats:', err);
    }
  }, [user, gameKey]);

  return { stats, loading, updateStats, refresh: loadStats };
}
