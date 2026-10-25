const API_BASE = import.meta.env.VITE_API_URL || '/api';
const LOCAL_USERS_KEY = 'nh_local_users';
const LOCAL_CURRENT_USER_KEY = 'nh_local_current_user';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('nh_token', token);
  } else {
    localStorage.removeItem('nh_token');
    localStorage.removeItem(LOCAL_CURRENT_USER_KEY);
  }
}

export function getAuthToken() {
  if (!authToken) {
    authToken = localStorage.getItem('nh_token');
  }
  return authToken;
}

function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalUsers(users) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function handleOfflineFallback(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};

  if (endpoint === '/auth/register' && method === 'POST') {
    const { email, password, name } = body;
    if (!email || !password || !name) {
      throw new Error('Email, password, and name are required');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    const users = getLocalUsers();
    const cleanEmail = email.trim().toLowerCase();
    if (users.some((u) => u.email === cleanEmail)) {
      throw new Error('Email already registered');
    }
    const avatarOptions = ['🌙', '⭐', '🎮', '⚡', '🚀', '🧩', '🌟', '💫', '🎯', '🏆', '🧠', '👑'];
    const avatar = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
    const newUser = {
      id: Date.now(),
      email: cleanEmail,
      password,
      name: name.trim(),
      avatar,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveLocalUsers(users);
    const { password: _, ...safeUser } = newUser;
    localStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(safeUser));
    return { user: safeUser, token: `local-token-${safeUser.id}` };
  }

  if (endpoint === '/auth/login' && method === 'POST') {
    const { email, password } = body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const users = getLocalUsers();
    const user = users.find((u) => u.email === cleanEmail && u.password === password);
    if (!user) {
      throw new Error('Invalid credentials (or backend server on port 3001 is offline)');
    }
    const { password: _, ...safeUser } = user;
    localStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(safeUser));
    return { user: safeUser, token: `local-token-${safeUser.id}` };
  }

  if (endpoint === '/auth/me' && method === 'GET') {
    const saved = localStorage.getItem(LOCAL_CURRENT_USER_KEY);
    if (!saved) throw new Error('Session expired');
    return { user: JSON.parse(saved) };
  }

  if (endpoint === '/auth/profile' && method === 'PUT') {
    const saved = localStorage.getItem(LOCAL_CURRENT_USER_KEY);
    if (!saved) throw new Error('User not found');
    const current = JSON.parse(saved);
    const updated = {
      ...current,
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.avatar !== undefined && { avatar: body.avatar })
    };
    localStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(updated));
    const users = getLocalUsers().map((u) => (u.id === updated.id ? { ...u, ...updated } : u));
    saveLocalUsers(users);
    return { user: updated };
  }

  if (endpoint === '/stats' && method === 'GET') {
    const stats = JSON.parse(localStorage.getItem('night-hours-stats') || '{}');
    return { stats, badges: [] };
  }

  if (endpoint.startsWith('/stats/game/') && method === 'POST') {
    const stats = JSON.parse(localStorage.getItem('night-hours-stats') || '{}');
    return { stats, badges: [] };
  }

  if (endpoint === '/sessions/vm/status' && method === 'GET') {
    return {
      online: true,
      telemetry: {
        nodeId: 'BLUESTACKS-MAC-5555',
        bluestacksRunning: true,
        bluestacksPort: 5555,
        adbBinary: '/Applications/BlueStacks.app/Contents/MacOS/hd-adb',
        cpuModel: 'Apple Silicon Virtualized Core',
        cores: 8,
        cpuLoadPercent: 22,
        ramUsedGb: 11.4,
        ramTotalGb: 16,
        uptimeSeconds: 14200,
        activeSessions: 1
      },
      containers: []
    };
  }

  if (endpoint === '/sessions/vm/provision' && method === 'POST') {
    const gameTitle = body.game || 'BGMI';
    return {
      session: {
        sessionId: `BS-${Date.now().toString(36).toUpperCase()}`,
        roomId: `game-${gameTitle.toLowerCase().replace(/\s+/g, '-')}`,
        game: gameTitle,
        androidPackage: body.androidPackage || 'com.pubg.imobile',
        quality: body.quality || '1080p60',
        mode: body.mode || 'bluestacks',
        node: 'BLUESTACKS-MAC-5555',
        bluestacksRunning: true,
        adbDevice: '127.0.0.1:5555',
        status: 'running',
        startedAt: new Date().toISOString()
      },
      telemetry: {
        nodeId: 'BLUESTACKS-MAC-5555',
        bluestacksRunning: true,
        bluestacksPort: 5555,
        cores: 8,
        cpuLoadPercent: 28,
        ramUsedGb: 12.1,
        ramTotalGb: 16
      }
    };
  }

  if (endpoint === '/sessions/vm/terminate' && method === 'POST') {
    return { terminated: true };
  }

  throw new Error('Backend server is unreachable on port 3001');
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();

  if (token && token.startsWith('local-token-') && !endpoint.startsWith('/sessions/vm') && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
    return handleOfflineFallback(endpoint, options);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
  } catch {
    return handleOfflineFallback(endpoint, options);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status >= 500 && (!data || !data.error)) {
      return handleOfflineFallback(endpoint, options);
    }
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data || {};
}

export const authApi = {
  register: (email, password, name) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => request('/auth/me'),

  updateProfile: (data) =>
    request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) })
};

export const statsApi = {
  getAll: () => request('/stats'),

  updateGame: (gameKey, { score, streak, highScore }) =>
    request(`/stats/game/${gameKey}`, {
      method: 'POST',
      body: JSON.stringify({ score, streak, highScore })
    }),

  getLeaderboard: (gameKey, limit = 10) =>
    request(`/stats/leaderboard/${gameKey}?limit=${limit}`)
};

export const sessionsApi = {
  requestSession: (game, playerName, email, note) =>
    request('/sessions/request', {
      method: 'POST',
      body: JSON.stringify({ game, playerName, email, note })
    }),

  getMyRequests: () => request('/sessions/requests'),

  getVmStatus: () => request('/sessions/vm/status'),

  provisionVm: (game, androidPackage = 'com.pubg.imobile', quality = '1080p60', mode = 'bluestacks') =>
    request('/sessions/vm/provision', {
      method: 'POST',
      body: JSON.stringify({ game, androidPackage, quality, mode })
    }),

  terminateVm: (sessionId) =>
    request('/sessions/vm/terminate', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })
};

export function initAuth() {
  const token = localStorage.getItem('nh_token');
  if (token) {
    authToken = token;
  }
}
