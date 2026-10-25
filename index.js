import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import statsRoutes from './routes/stats.js';
import sessionRoutes, {
  getSystemTelemetry,
  executeBlueStacksAdb,
  launchAppInBlueStacks
} from './routes/sessions.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
  credentials: true
};
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', async (_, res) => res.json({
  status: 'online',
  mode: 'full-backend',
  telemetry: await getSystemTelemetry()
}));

app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/sessions', sessionRoutes);

const rooms = new Map();
const pendingCandidates = new Map();
const BS_SCREEN_W = 1920;
const BS_SCREEN_H = 1080;

io.on('connection', async (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.emit('vm-telemetry', await getSystemTelemetry());

  socket.on('vm-ping', async (clientSentAt, callback) => {
    const payload = {
      clientSentAt,
      serverTime: Date.now(),
      telemetry: await getSystemTelemetry()
    };
    if (typeof callback === 'function') {
      callback(payload);
    } else {
      socket.emit('vm-pong', payload);
    }
  });

  socket.on('join-room', async ({ roomId, role, offer }) => {
    if (!roomId) return;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { host: null, vmAgent: null, viewers: new Set(), offer: null });
    }
    const room = rooms.get(roomId);

    if (role === 'host') {
      room.host = socket.id;
      if (offer) room.offer = offer;
      if (pendingCandidates.has(roomId)) {
        pendingCandidates.get(roomId).forEach(candidate => {
          socket.emit('candidate', candidate);
        });
        pendingCandidates.delete(roomId);
      }
      socket.to(roomId).emit('host-ready', { hostId: socket.id });
    } else if (role === 'vm-agent') {
      room.vmAgent = socket.id;
    } else {
      room.viewers.add(socket.id);
      if (room.offer) {
        socket.emit('offer', { offer: room.offer });
      }
      if (room.host) {
        io.to(room.host).emit('viewer-joined', { viewerId: socket.id, count: room.viewers.size });
      }
    }

    const totalPeers = room.viewers.size + (room.host ? 1 : 0);
    io.to(roomId).emit('viewer-count', { count: Math.max(1, totalPeers) });

    socket.emit('room-joined', {
      roomId,
      role,
      isHost: role === 'host',
      hasHost: Boolean(room.host),
      hasVmAgent: Boolean(room.vmAgent),
      viewerCount: Math.max(1, totalPeers),
      telemetry: await getSystemTelemetry()
    });
  });

  // Launch game directly inside local BlueStacks (port 5555)
  socket.on('vm-launch-game', async (payload) => {
    const { roomId, title, androidPackage = 'com.pubg.imobile' } = payload || {};
    if (!roomId) return;
    socket.to(roomId).emit('vm-launch-game', payload);

    const res = await launchAppInBlueStacks(androidPackage, 5555);
    socket.emit('vm-agent-status', {
      roomId,
      status: 'launched',
      message: `BlueStacks (127.0.0.1:5555) launched ${title || androidPackage}`
    });
  });

  // Translate website PC Keymapper controls directly into BlueStacks ADB touch gestures on port 5555
  socket.on('vm-input', (payload) => {
    if (!payload) return;
    const { roomId } = payload;

    if (payload.type === 'keymap-tap' && typeof payload.nx === 'number' && typeof payload.ny === 'number') {
      const x = Math.round(payload.nx * BS_SCREEN_W);
      const y = Math.round(payload.ny * BS_SCREEN_H);
      executeBlueStacksAdb(`input tap ${x} ${y}`, 5555);
    } else if (payload.type === 'keymap-joystick' && typeof payload.nx === 'number' && typeof payload.ny === 'number') {
      const startX = Math.round(payload.nx * BS_SCREEN_W);
      const startY = Math.round(payload.ny * BS_SCREEN_H);
      const endX = Math.round((payload.nx + (payload.dx || 0) * 0.08) * BS_SCREEN_W);
      const endY = Math.round((payload.ny + (payload.dy || 0) * 0.08) * BS_SCREEN_H);
      executeBlueStacksAdb(`input swipe ${startX} ${startY} ${endX} ${endY} 110`, 5555);
    }

    if (roomId) {
      const room = rooms.get(roomId);
      if (room?.host) io.to(room.host).emit('vm-input', payload);
      if (room?.vmAgent) io.to(room.vmAgent).emit('vm-input', payload);
    }
  });

  socket.on('offer', ({ roomId, offer }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.offer = offer;
      socket.to(roomId).emit('offer', { offer });
    }
  });

  socket.on('answer', ({ roomId, answer }) => {
    socket.to(roomId).emit('answer', { answer });
  });

  socket.on('candidate', ({ roomId, candidate }) => {
    const room = rooms.get(roomId);
    if (room && room.host && socket.id !== room.host) {
      io.to(room.host).emit('candidate', { candidate });
    } else if (room) {
      socket.to(roomId).emit('candidate', { candidate });
    }
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      if (room.host === socket.id) {
        room.host = null;
        room.offer = null;
        io.to(roomId).emit('host-disconnected');
        pendingCandidates.delete(roomId);
      } else if (room.vmAgent === socket.id) {
        room.vmAgent = null;
      } else if (room.viewers.has(socket.id)) {
        room.viewers.delete(socket.id);
      }
      const total = room.viewers.size + (room.host ? 1 : 0);
      if (total === 0 && !room.vmAgent) {
        rooms.delete(roomId);
      } else {
        io.to(roomId).emit('viewer-count', { count: Math.max(1, total) });
      }
    });
  });
});

setInterval(async () => {
  if (io.engine.clientsCount > 0) {
    io.emit('vm-telemetry', await getSystemTelemetry());
  }
}, 3000);

const PORT = Number(process.env.PORT) || 3001;

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Backend already running on port ${PORT}.`);
    process.exit(0);
  }
  console.error('Backend server error:', err);
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Night Hours backend & BlueStacks ADB bridge running on http://0.0.0.0:${PORT}`);
  console.log(`BlueStacks target: 127.0.0.1:5555 (/Applications/BlueStacks.app)`);
});
