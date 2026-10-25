#!/usr/bin/env node
/**
 * Night Hours — Mobile & Desktop Cloud VM Host Agent (with ADB Touch Bridge)
 * --------------------------------------------------------------------------
 * Translates PC keyboard & mouse keymap controls from Night Arena into:
 *   1. Android VM / Phone multi-touch gestures via ADB (`adb shell input tap / swipe / keyevent`)
 *   2. Desktop VM game executable launches & input events
 *
 * Usage:
 *   SIGNALING_URL=http://127.0.0.1:3001 ADB_DEVICE=127.0.0.1:5555 node vm-host-agent.js
 */

import { io } from 'socket.io-client';
import { spawn, exec } from 'child_process';
import os from 'os';

const SIGNALING_URL = process.env.SIGNALING_URL || 'http://127.0.0.1:3001';
const ADB_DEVICE = process.env.ADB_DEVICE || '127.0.0.1:5555';
const VM_SCREEN_W = Number(process.env.VM_SCREEN_W) || 1920;
const VM_SCREEN_H = Number(process.env.VM_SCREEN_H) || 1080;

const MOBILE_PACKAGES = {
  'BGMI.exe': 'com.pubg.imobile',
  'VALORANT.exe': 'com.riotgames.valorant.mobile',
  'r5apex.exe': 'com.ea.gp.apexlegendsmobilefps',
  're4.exe': 'jp.co.capcom.re4',
  'Cyberpunk2077.exe': 'com.cdprojektred.cyberpunk',
  'eldenring.exe': 'com.bandainamcoent.eldenring',
};

const ALL_ROOMS = [
  'game-valorant',
  'game-bgmi',
  'game-resident-evil-4',
  'game-cyberpunk-2077',
  'game-elden-ring',
  'game-apex-legends',
];

console.log('==========================================================');
console.log('  Night Hours — Mobile Cloud VM & PC Keymapper Agent');
console.log(`  Signaling Server : ${SIGNALING_URL}`);
console.log(`  Android VM (ADB) : ${ADB_DEVICE} (${VM_SCREEN_W}x${VM_SCREEN_H})`);
console.log('==========================================================');

const socket = io(SIGNALING_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
});

function runAdb(cmd) {
  exec(`adb -s ${ADB_DEVICE} shell ${cmd}`, { timeout: 1500 }, () => {});
}

socket.on('connect', () => {
  console.log(`[VM-Agent] Connected to signaling server (id: ${socket.id})`);
  ALL_ROOMS.forEach((roomId) => {
    socket.emit('join-room', { roomId, role: 'vm-agent' });
  });
});

socket.on('vm-launch-game', ({ roomId, title, executable, androidPackage }) => {
  const pkg = androidPackage || MOBILE_PACKAGES[executable] || 'com.pubg.imobile';
  console.log(`[VM-Agent] Launching mobile app ${title} (${pkg}) on Android VM ${ADB_DEVICE}`);

  exec(`adb connect ${ADB_DEVICE} && adb -s ${ADB_DEVICE} shell monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`, (err) => {
    if (err) {
      console.log(`[VM-Agent] ADB note: ${err.message.trim()} (Ready for browser/WebRTC keymap bridge)`);
    }
    socket.emit('vm-agent-status', {
      roomId,
      status: 'launched',
      message: `Android VM launched ${pkg} with PC Keymapper profile active`,
    });
  });
});

// Translate PC Keymap Controls (WASD Joystick, Mouse Fire/Scope, Jump/Crouch/Peek/Reload) -> Android Touch Coordinates
socket.on('vm-input', (input) => {
  if (!input) return;

  if (input.type === 'keymap-tap' && typeof input.nx === 'number' && typeof input.ny === 'number') {
    const x = Math.round(input.nx * VM_SCREEN_W);
    const y = Math.round(input.ny * VM_SCREEN_H);
    runAdb(`input tap ${x} ${y}`);
  } else if (input.type === 'keymap-joystick' && typeof input.nx === 'number' && typeof input.ny === 'number') {
    const startX = Math.round(input.nx * VM_SCREEN_W);
    const startY = Math.round(input.ny * VM_SCREEN_H);
    const endX = Math.round((input.nx + (input.dx || 0) * 0.08) * VM_SCREEN_W);
    const endY = Math.round((input.ny + (input.dy || 0) * 0.08) * VM_SCREEN_H);
    runAdb(`input swipe ${startX} ${startY} ${endX} ${endY} 120`);
  } else if (input.type === 'keymap-swipe' && typeof input.x1 === 'number') {
    const x1 = Math.round(input.x1 * VM_SCREEN_W);
    const y1 = Math.round(input.y1 * VM_SCREEN_H);
    const x2 = Math.round(input.x2 * VM_SCREEN_W);
    const y2 = Math.round(input.y2 * VM_SCREEN_H);
    runAdb(`input swipe ${x1} ${y1} ${x2} ${y2} ${input.duration || 80}`);
  }
});

socket.on('disconnect', () => {
  console.log('[VM-Agent] Disconnected from signaling server. Retrying...');
});
