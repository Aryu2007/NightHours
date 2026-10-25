import express from 'express';
import os from 'os';
import fs from 'fs';
import net from 'net';
import { exec } from 'child_process';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const recentRequests = new Map();
const activeVmSessions = new Map();

const BLUESTACKS_APP_PATH = '/Applications/BlueStacks.app';
const BLUESTACKS_ADB_CANDIDATES = [
  '/Applications/BlueStacks.app/Contents/MacOS/hd-adb',
  '/Applications/BlueStacks.app/Contents/MacOS/HD-Adb',
  '/Applications/BlueStacks.app/Contents/MacOS/adb',
  '/opt/homebrew/bin/adb',
  '/usr/local/bin/adb',
];

export function resolveAdbBinary() {
  for (const candidate of BLUESTACKS_ADB_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) return `"${candidate}"`;
    } catch {
      // Continue checking
    }
  }
  return 'adb';
}

export function checkBlueStacksPort(port = 5555, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (isOpen) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(isOpen);
      }
    };
    socket.setTimeout(600);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

export function executeBlueStacksAdb(adbCommand, port = 5555) {
  const adbBin = resolveAdbBinary();
  const device = `127.0.0.1:${port}`;
  exec(`${adbBin} -s ${device} shell ${adbCommand}`, { timeout: 1500 }, () => {});
}

export function launchAppInBlueStacks(packageName = 'com.pubg.imobile', port = 5555) {
  return new Promise((resolve) => {
    const adbBin = resolveAdbBinary();
    const device = `127.0.0.1:${port}`;
    // Bring BlueStacks to life on macOS and launch the Android package via ADB
    const openCmd = `open -a "${BLUESTACKS_APP_PATH}"`;
    const launchCmd = `${adbBin} connect ${device} && ${adbBin} -s ${device} shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`;

    exec(`${openCmd} && (${launchCmd} || true)`, { timeout: 4000 }, (err, stdout) => {
      resolve({
        launched: !err,
        adbBinary: adbBin,
        device,
        packageName,
        output: (stdout || '').trim(),
      });
    });
  });
}

function generateRequestId() {
  return `NH-${Date.now().toString(36).toUpperCase()}`;
}

function sanitizeText(value, maxLength = 120) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function getSystemTelemetry() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemGb = ((totalMem - freeMem) / (1024 ** 3)).toFixed(1);
  const totalMemGb = (totalMem / (1024 ** 3)).toFixed(1);
  const cpus = os.cpus();
  const load = os.loadavg()[0] || 0.4;
  const cpuPercent = Math.min(98, Math.max(8, Math.round((load / Math.max(1, cpus.length)) * 100) + 12));
  const bluestacksRunning = await checkBlueStacksPort(5555);

  return {
    nodeId: bluestacksRunning ? 'BLUESTACKS-MAC-5555' : 'MUMBAI-EDGE-01',
    bluestacksRunning,
    bluestacksPort: 5555,
    adbBinary: resolveAdbBinary().replace(/"/g, ''),
    cpuModel: cpus[0]?.model || 'Apple Silicon Virtualized Core',
    cores: cpus.length,
    cpuLoadPercent: cpuPercent,
    ramUsedGb: Number(usedMemGb),
    ramTotalGb: Number(totalMemGb),
    uptimeSeconds: Math.round(os.uptime()),
    activeSessions: activeVmSessions.size,
    timestamp: new Date().toISOString()
  };
}

router.get('/vm/status', async (_req, res) => {
  const telemetry = await getSystemTelemetry();
  res.json({
    online: true,
    telemetry,
    sessions: Array.from(activeVmSessions.values())
  });
});

router.post('/vm/provision', async (req, res) => {
  try {
    const { game, androidPackage = 'com.pubg.imobile', quality = '1080p60', mode = 'bluestacks' } = req.body || {};
    const gameTitle = sanitizeText(game || 'BGMI', 60);
    const sessionId = `BS-${Date.now().toString(36).toUpperCase()}`;
    const roomId = `game-${gameTitle.toLowerCase().replace(/\s+/g, '-')}`;

    const bsResult = await launchAppInBlueStacks(androidPackage, 5555);
    const telemetry = await getSystemTelemetry();

    const session = {
      sessionId,
      roomId,
      game: gameTitle,
      androidPackage,
      quality,
      mode,
      node: telemetry.nodeId,
      bluestacksRunning: telemetry.bluestacksRunning,
      adbDevice: bsResult.device,
      status: 'running',
      startedAt: new Date().toISOString()
    };

    activeVmSessions.set(sessionId, session);

    res.status(201).json({
      session,
      bluestacks: bsResult,
      telemetry
    });
  } catch (err) {
    console.error('VM provision error:', err);
    res.status(500).json({ error: 'Failed to provision BlueStacks VM session' });
  }
});

router.post('/vm/terminate', async (req, res) => {
  const { sessionId } = req.body || {};
  if (sessionId && activeVmSessions.has(sessionId)) {
    activeVmSessions.delete(sessionId);
  }
  const telemetry = await getSystemTelemetry();
  res.json({
    terminated: true,
    telemetry
  });
});

router.post('/request', authenticateToken, (req, res) => {
  try {
    const ip = req.ip;
    const lastRequest = recentRequests.get(ip) || 0;
    if (Date.now() - lastRequest < 30000) {
      return res.status(429).json({ error: 'Please wait before sending another request.' });
    }

    const { game, note } = req.body;
    const playerName = sanitizeText(req.body.playerName, 24);
    const email = sanitizeText(req.body.email, 120);
    const gameName = sanitizeText(game, 60);
    const noteText = sanitizeText(note, 240);

    if (!playerName || !email.includes('@') || !gameName) {
      return res.status(400).json({ error: 'Please enter a name, email, and game.' });
    }

    const requestId = generateRequestId();
    db.sessionRequests.create({
      id: requestId,
      userId: req.user.id,
      playerName,
      email,
      game: gameName,
      note: noteText,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    recentRequests.set(ip, Date.now());

    res.status(201).json({ request: { id: requestId, status: 'pending' } });
  } catch (err) {
    console.error('Session request error:', err);
    res.status(500).json({ error: 'Could not send request' });
  }
});

router.get('/requests', authenticateToken, (req, res) => {
  const requests = db.sessionRequests.findByUser(req.user.id);
  res.json({ requests });
});

router.get('/admin/requests', authenticateToken, (req, res) => {
  if (req.user.email !== 'admin@night-hours.local') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const requests = db.sessionRequests.findAll();
  res.json({ requests });
});

router.put('/admin/requests/:id', authenticateToken, (req, res) => {
  if (req.user.email !== 'admin@night-hours.local') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.sessionRequests.updateStatus(req.params.id, status);
  res.json({ success: true });
});

export default router;
