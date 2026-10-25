import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { statsApi } from '../services/api';
import { readLocalStatsMap } from '../hooks/useGameStats';

const badgeInfo = {
  veteran: { icon: '🎖️', name: 'Veteran', desc: 'Play 10 games' },
  legend: { icon: '🏅', name: 'Legend', desc: 'Play 50 games' },
  scorer: { icon: '💯', name: 'Scorer', desc: 'Reach 1,000 total score' },
  master: { icon: '🏆', name: 'Master', desc: 'Reach 5,000 total score' },
  streaker: { icon: '🔥', name: 'Streaker', desc: 'Get a 10+ streak in any game' },
  completionist: { icon: '✨', name: 'Completionist', desc: 'Play every game at least once' },
};

const gameKeys = [
  { key: 'memory', label: 'Memory Match', icon: '🧠', color: 'violet', to: '/learning' },
  { key: 'typesprint', label: 'Type Sprint', icon: '⌨️', color: 'blue', to: '/learning/typesprint' },
  { key: 'math', label: 'Math Quest', icon: '🧮', color: 'pink', to: '/learning/mathquest' },
  { key: 'quiz', label: 'Quiz Rush & Battle', icon: '⚡', color: 'blue', to: '/rising' },
  { key: 'pattern', label: 'Pattern Recall', icon: '◫', color: 'pink', to: '/golden' },
];

function Profile() {
  const { user, updateProfile } = useAuth();
  const [stats, setStats] = useState({});
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [avatarInput, setAvatarInput] = useState(user?.avatar || '🌙');
  const [saving, setSaving] = useState(false);

  const avatarOptions = ['🌙', '⭐', '🎮', '⚡', '🚀', '🧩', '🌟', '💫', '🎯', '🏆', '🧠', '👑'];

  const loadProfile = useCallback(async () => {
    try {
      const data = await statsApi.getAll();
      setStats(data.stats || {});
      setBadges(data.badges || []);
    } catch (err) {
      console.error('Failed to load profile from API, falling back to local stats:', err);
      setStats(readLocalStatsMap());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadProfile();
      setNameInput(user.name);
      setAvatarInput(user.avatar);
    }
  }, [user, loadProfile]);

  useEffect(() => {
    const handleBadgesUpdated = (e) => {
      if (Array.isArray(e.detail)) {
        setBadges(e.detail);
      }
    };
    window.addEventListener('badges-updated', handleBadgesUpdated);
    return () => window.removeEventListener('badges-updated', handleBadgesUpdated);
  }, []);

  const saveProfile = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ name: nameInput.trim(), avatar: avatarInput });
      setEditing(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const getTotalGames = () => Object.values(stats).reduce((sum, s) => sum + (s.gamesPlayed || 0), 0);
  const getTotalScore = () => Object.values(stats).reduce((sum, s) => sum + (s.totalScore || 0), 0);

  const recentGames = gameKeys
    .flatMap((game) => {
      const entries = stats[game.key]?.highScores || [];
      return entries.map((entry) => ({
        ...entry,
        gameKey: game.key,
        label: game.label,
        icon: game.icon,
        to: game.to
      }));
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 6);

  const memberCreatedAt = user?.createdAt || user?.created_at;

  if (loading) {
    return (
      <section className="profile-page">
        <div className="auth-loading" style={{ padding: '60px 0' }}>
          <div className="spinner"></div>
          <p>Loading profile…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar-section">
          <div
            className="avatar-display"
            role="button"
            tabIndex={0}
            aria-label="Edit profile avatar and name"
            onClick={() => setEditing(true)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditing(true)}
          >
            <span className="avatar-emoji">{avatarInput}</span>
            {editing && <span className="avatar-edit">✎</span>}
          </div>
          {editing && (
            <div className="avatar-picker">
              {avatarOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`avatar-option ${avatarInput === emoji ? 'selected' : ''}`}
                  onClick={() => setAvatarInput(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <div className="profile-name-section">
            {editing ? (
              <div className="name-edit">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveProfile()}
                  autoFocus
                  placeholder="Enter your name"
                  maxLength="20"
                />
                <button className="primary-button" type="button" onClick={saveProfile} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            ) : (
              <h1>{nameInput || 'Night Owl'}</h1>
            )}
            <p className="member-since">
              Member since{' '}
              {memberCreatedAt
                ? new Date(memberCreatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : 'Just now'}
            </p>
          </div>
        </div>
        <div className="profile-stats">
          <div className="stat-card large">
            <span className="stat-label">GAMES PLAYED</span>
            <strong>{getTotalGames()}</strong>
          </div>
          <div className="stat-card large">
            <span className="stat-label">TOTAL SCORE</span>
            <strong>{getTotalScore().toLocaleString()}</strong>
          </div>
          <div className="stat-card large">
            <span className="stat-label">BADGES EARNED</span>
            <strong>{badges.length}/6</strong>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="badges-section">
          <div className="section-header">
            <p className="eyebrow">ACHIEVEMENTS</p>
            <h2>Your Badges</h2>
          </div>
          <div className="badges-grid">
            {Object.entries(badgeInfo).map(([key, badge]) => (
              <div key={key} className={`badge-card ${badges.includes(key) ? 'earned' : 'locked'}`}>
                <span className="badge-icon">{badge.icon}</span>
                <div className="badge-info">
                  <strong>{badge.name}</strong>
                  <small>{badge.desc}</small>
                </div>
                {badges.includes(key) && <span className="badge-check">✓</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="streaks-section">
          <div className="section-header">
            <p className="eyebrow">BEST STREAKS</p>
            <h2>Personal Records</h2>
          </div>
          <div className="streaks-grid">
            {gameKeys.map((game) => {
              const gameStat = stats[game.key] || {};
              return (
                <Link key={game.key} to={game.to} className={`streak-card ${game.color}`}>
                  <div className="streak-header">
                    <span className="streak-icon">{game.icon}</span>
                    <span>{game.label}</span>
                  </div>
                  <div className="streak-value">
                    <strong>{gameStat.bestStreak || 0}</strong>
                    <span>best · {gameStat.gamesPlayed || 0} played</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="recent-games">
          <div className="section-header">
            <p className="eyebrow">ACTIVITY</p>
            <h2>Recent High Scores</h2>
          </div>
          <div className="recent-list">
            {recentGames.length === 0 ? (
              <p className="empty-state">Your game history will appear here after you play.</p>
            ) : (
              <ul className="recent-activity-items">
                {recentGames.map((item, idx) => (
                  <li key={`${item.gameKey}-${item.date}-${idx}`} className="recent-activity-item">
                    <Link to={item.to} className="recent-activity-game">
                      <span className="recent-activity-icon">{item.icon}</span>
                      <div>
                        <strong>{item.label}</strong>
                        <small>
                          {item.date
                            ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'Recent'}
                        </small>
                      </div>
                    </Link>
                    <div className="recent-activity-metrics">
                      <span className="recent-score">{item.score} pts</span>
                      <span className="recent-streak">Streak: {item.streak}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Profile;
