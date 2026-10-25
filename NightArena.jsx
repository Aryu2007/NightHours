import React, { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { sessionsApi } from '../services/api'
import { useGameStats } from '../hooks/useGameStats'

// Dedicated, authentic PC-to-Mobile / BlueStacks Keymap Profiles per Game
const GAME_KEYMAP_PRESETS = {
  bgmi: [
    { id: 'fire', label: 'Fire (Auto)', key: 'Mouse0', displayKey: 'L-Click', x: 83, y: 66, type: 'fire' },
    { id: 'scope', label: 'Scope / ADS', key: 'Mouse2', displayKey: 'R-Click', x: 92, y: 50, type: 'scope' },
    { id: 'peekL', label: 'Peek Left', key: 'KeyQ', displayKey: 'Q', x: 26, y: 42, type: 'action' },
    { id: 'peekR', label: 'Peek Right', key: 'KeyE', displayKey: 'E', x: 33, y: 42, type: 'action' },
    { id: 'jump', label: 'Jump / Climb', key: 'Space', displayKey: 'Space', x: 93, y: 68, type: 'action' },
    { id: 'crouch', label: 'Crouch', key: 'KeyC', displayKey: 'C', x: 87, y: 84, type: 'action' },
    { id: 'prone', label: 'Prone', key: 'KeyZ', displayKey: 'Z', x: 77, y: 86, type: 'action' },
    { id: 'reload', label: 'Reload', key: 'KeyR', displayKey: 'R', x: 75, y: 74, type: 'action' },
    { id: 'interact', label: 'Loot / Drive', key: 'KeyF', displayKey: 'F', x: 66, y: 38, type: 'action' },
    { id: 'freelook', label: 'Free Look', key: 'AltLeft', displayKey: 'Alt', x: 78, y: 26, type: 'utility' },
    { id: 'wpn1', label: 'M416 (AR)', key: 'Digit1', displayKey: '1', x: 40, y: 89, type: 'slot' },
    { id: 'wpn2', label: 'AWM (Sniper)', key: 'Digit2', displayKey: '2', x: 48, y: 89, type: 'slot' },
    { id: 'heal', label: 'First Aid', key: 'Digit3', displayKey: '3', x: 56, y: 89, type: 'slot' },
    { id: 'nade', label: 'Frag / Smoke', key: 'KeyG', displayKey: 'G', x: 64, y: 89, type: 'slot' },
    { id: 'bag', label: 'Backpack', key: 'Tab', displayKey: 'Tab', x: 9, y: 88, type: 'utility' },
    { id: 'map', label: 'Erangel Map', key: 'KeyM', displayKey: 'M', x: 91, y: 16, type: 'utility' },
  ],
  valorant: [
    { id: 'fire', label: 'Primary Fire', key: 'Mouse0', displayKey: 'L-Click', x: 84, y: 64, type: 'fire' },
    { id: 'scope', label: 'ADS / Alt Fire', key: 'Mouse2', displayKey: 'R-Click', x: 92, y: 48, type: 'scope' },
    { id: 'abilityC', label: 'Cloudburst (Smoke)', key: 'KeyC', displayKey: 'C', x: 35, y: 88, type: 'action' },
    { id: 'abilityQ', label: 'Updraft (Jump)', key: 'KeyQ', displayKey: 'Q', x: 44, y: 88, type: 'action' },
    { id: 'abilityE', label: 'Tailwind (Dash)', key: 'KeyE', displayKey: 'E', x: 53, y: 88, type: 'action' },
    { id: 'ultX', label: 'Blade Storm (Ult)', key: 'KeyX', displayKey: 'X', x: 62, y: 88, type: 'scope' },
    { id: 'spike', label: 'Plant / Defuse Spike', key: 'Digit4', displayKey: '4', x: 72, y: 42, type: 'action' },
    { id: 'reload', label: 'Reload Vandal', key: 'KeyR', displayKey: 'R', x: 76, y: 74, type: 'action' },
    { id: 'jump', label: 'Jump', key: 'Space', displayKey: 'Space', x: 92, y: 70, type: 'action' },
    { id: 'crouch', label: 'Crouch (Hold)', key: 'ControlLeft', displayKey: 'Ctrl', x: 86, y: 84, type: 'action' },
    { id: 'wpn1', label: 'Vandal', key: 'Digit1', displayKey: '1', x: 88, y: 32, type: 'slot' },
    { id: 'wpn2', label: 'Sheriff', key: 'Digit2', displayKey: '2', x: 88, y: 22, type: 'slot' },
    { id: 'buy', label: 'Buy Menu', key: 'KeyB', displayKey: 'B', x: 12, y: 22, type: 'utility' },
    { id: 'drop', label: 'Drop Weapon', key: 'KeyG', displayKey: 'G', x: 24, y: 78, type: 'utility' },
  ],
}

const games = [
  {
    id: 'bgmi',
    title: 'BGMI (Battlegrounds Mobile India)',
    genre: 'BlueStacks Android VM · 127.0.0.1:5555',
    icon: '✦',
    accent: 'orange',
    size: '2.4 GB APK',
    executable: 'BGMI.exe',
    androidPackage: 'com.pubg.imobile',
    presetName: 'BGMI Smart Keymap (Erangel)',
    controls: 'WASD + Shift Sprint · L-Click Fire · R-Click 4x Scope · Q/E Peek Lean · C Crouch · Z Prone · F Loot · 1/2/3/G',
  },
  {
    id: 'valorant',
    title: 'Valorant (5v5 Tactical Agent FPS)',
    genre: 'BlueStacks / Cloud VM · 127.0.0.1:5555',
    icon: '◈',
    accent: 'purple',
    size: '3.1 GB APK',
    executable: 'VALORANT.exe',
    androidPackage: 'com.riotgames.valorant.mobile',
    presetName: 'Valorant Agent Keymap (Jett)',
    controls: 'WASD + Shift Silent Walk · L-Click Vandal · R-Click ADS · C Smoke · Q Updraft · E Dash · X Blade Storm Ult · 4 Spike',
  },
  {
    id: 'apex',
    title: 'Apex Legends Mobile',
    genre: 'BlueStacks Android VM · 127.0.0.1:5555',
    icon: '◆',
    accent: 'red',
    size: '2.8 GB APK',
    executable: 'r5apex.exe',
    androidPackage: 'com.ea.gp.apexlegendsmobilefps',
    presetName: 'Apex Kinetic Keymap',
    controls: 'WASD Move · C Slide · Space Jump · L-Click Fire · R-Click Zoom · Q Tactical · X Ultimate',
  },
  {
    id: 're4',
    title: 'Resident Evil 4',
    genre: 'Survival Horror · Cloud / BlueStacks VM',
    icon: '◉',
    accent: 'red',
    size: '4.2 GB',
    executable: 're4.exe',
    androidPackage: 'jp.co.capcom.re4',
    presetName: 'Survival Horror Keymap',
    controls: 'WASD Move · R-Click Laser Sight · L-Click Fire · Space Parry · R Reload · F Interact',
  },
  {
    id: 'cyberpunk',
    title: 'Cyberpunk 2077',
    genre: 'Open World RPG · Cloud VM',
    icon: '◎',
    accent: 'cyan',
    size: '4.5 GB',
    executable: 'Cyberpunk2077.exe',
    androidPackage: 'com.cdprojektred.cyberpunk',
    presetName: 'Night City Cyberware Keymap',
    controls: 'WASD Steer/Move · Space EMP Overdrive · Q Quickhack · E Sandevistan · L-Click Fire',
  },
  {
    id: 'eldenring',
    title: 'Elden Ring',
    genre: 'Action RPG · Cloud VM',
    icon: '✧',
    accent: 'gold',
    size: '3.9 GB',
    executable: 'eldenring.exe',
    androidPackage: 'com.bandainamcoent.eldenring',
    presetName: 'Souls Combat Keymap',
    controls: 'WASD Move · Space Dodge Roll · L-Click Light Slash · R-Click Heavy Strike · R Flask Heal',
  },
]

const DEFAULT_SIGNALING = import.meta.env.VITE_SIGNALING_URL || `http://${window.location.hostname}:3001`

function formatKeyLabel(code) {
  if (!code) return '?'
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code === 'Space') return 'Space'
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl'
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt'
  return code
}

function getInitialKeymapForGame(gameId) {
  try {
    const saved = localStorage.getItem(`nh_keymap_${gameId}`)
    if (saved) return JSON.parse(saved)
  } catch {
    // Fallback to preset
  }
  return GAME_KEYMAP_PRESETS[gameId] || GAME_KEYMAP_PRESETS.bgmi
}

function NightArena() {
  const { updateStats } = useGameStats('arena')
  const [selectedGame, setSelectedGame] = useState(games[0])
  const [sessionStatus, setSessionStatus] = useState('ready')
  const [vmBackendMode, setVmBackendMode] = useState('bluestacks-live') // 'bluestacks-live' | 'mobile-vm-sim' | 'android-vnc'
  const [androidVncUrl, setAndroidVncUrl] = useState(() => localStorage.getItem('nh_android_vnc_url') || 'http://127.0.0.1:6080')
  const [signalingEndpoint] = useState(() => localStorage.getItem('nh_signaling_url') || DEFAULT_SIGNALING)

  const [keymap, setKeymap] = useState(() => getInitialKeymapForGame(games[0].id))
  const [showKeymapOverlay, setShowKeymapOverlay] = useState(true)
  const [editingKeymap, setEditingKeymap] = useState(false)
  const [rebindingId, setRebindingId] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [activeKeys, setActiveKeys] = useState({})
  const [joystickVec, setJoystickVec] = useState({ dx: 0, dy: 0, sprinting: false })
  const [scopeActive, setScopeActive] = useState(false)
  const [leanDir, setLeanDir] = useState(0)
  const [stance, setStance] = useState('STAND')
  const [activeSlot, setActiveSlot] = useState(1)
  const [touchRipples, setTouchRipples] = useState([])
  const [inputCount, setInputCount] = useState(0)
  const [lastActionText, setLastActionText] = useState('BlueStacks ADB 127.0.0.1:5555 Ready')

  const [bootProgress, setBootProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState(0)
  const [logs, setLogs] = useState([])
  const [streamQuality, setStreamQuality] = useState('1080p60')
  const [latency, setLatency] = useState(2)
  const [fps, setFps] = useState(60)
  const [sessionTime, setSessionTime] = useState(0)
  const [connectionState, setConnectionState] = useState('connected')
  const [vmTelemetry, setVmTelemetry] = useState({
    nodeId: 'BLUESTACKS-MAC-5555',
    bluestacksRunning: true,
    bluestacksPort: 5555,
    adbBinary: '/Applications/BlueStacks.app/Contents/MacOS/hd-adb',
    cores: 8,
    cpuLoadPercent: 22,
    ramUsedGb: 11.2,
    ramTotalGb: 16,
  })
  const [vmSessionId, setVmSessionId] = useState(null)
  const [hudStats, setHudStats] = useState({ score: 0, kills: 0, alive: 64, hp: 100, ammo: 30, maxAmmo: 30, statusBanner: '' })
  const [hasBlueStacksStream, setHasBlueStacksStream] = useState(false)
  const [error, setError] = useState(null)

  const viewportRef = useRef(null)
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const socketRef = useRef(null)
  const localStreamRef = useRef(null)
  const timerRef = useRef(null)
  const bootTimerRef = useRef(null)
  const bootRafRef = useRef(null)
  const gameLoopRafRef = useRef(null)
  const logRef = useRef(null)

  const keysRef = useRef({})
  const mouseRef = useRef({ x: 400, y: 215, down: false, clicked: false })
  const gameActionRef = useRef({
    reload: false,
    heal: false,
    nade: false,
    jump: 0,
    smoke: null,
    dash: 0,
    ultActive: false,
    spikeProgress: 0,
  })
  const stanceRef = useRef('STAND')
  const leanRef = useRef(0)
  const scopeRef = useRef(false)
  const slotRef = useRef(1)

  const addLog = useCallback((message, type = 'info') => {
    setLogs((prev) => [
      ...prev.slice(-99),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, message, type, time: new Date().toLocaleTimeString() }
    ])
  }, [])

  // Check BlueStacks status on mount
  useEffect(() => {
    sessionsApi.getVmStatus()
      .then((data) => {
        if (data?.telemetry) setVmTelemetry(data.telemetry)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setKeymap(getInitialKeymapForGame(selectedGame.id))
    setScopeActive(false)
    scopeRef.current = false
    setLeanDir(0)
    leanRef.current = 0
    setStance('STAND')
    stanceRef.current = 'STAND'
  }, [selectedGame.id])

  const getRoomId = useCallback((gameObj = selectedGame) => {
    return `game-${gameObj.id}`
  }, [selectedGame])

  // Attach captured BlueStacks MediaStream to <video> whenever videoRef mounts
  useEffect(() => {
    if (videoRef.current && localStreamRef.current) {
      videoRef.current.srcObject = localStreamRef.current
    }
  }, [hasBlueStacksStream, sessionStatus, vmBackendMode])

  const triggerTouchRipple = useCallback((xPercent, yPercent, label) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setTouchRipples((prev) => [...prev.slice(-8), { id, x: xPercent, y: yPercent, label }])
    window.setTimeout(() => {
      setTouchRipples((prev) => prev.filter((r) => r.id !== id))
    }, 420)
  }, [])

  // Send PC Keymapper tap/swipe coordinates to BlueStacks (127.0.0.1:5555) via Socket.IO -> Backend ADB Bridge
  const emitMobileTouch = useCallback((payload) => {
    setInputCount((c) => c + 1)
    if (socketRef.current?.connected) {
      socketRef.current.emit('vm-input', {
        roomId: getRoomId(),
        executable: selectedGame.executable,
        androidPackage: selectedGame.androidPackage,
        ...payload,
      })
    }
  }, [getRoomId, selectedGame.androidPackage, selectedGame.executable])

  const updateKeymapList = (nextMap) => {
    setKeymap(nextMap)
    localStorage.setItem(`nh_keymap_${selectedGame.id}`, JSON.stringify(nextMap))
  }

  const resetDefaultKeymap = () => {
    const preset = GAME_KEYMAP_PRESETS[selectedGame.id] || GAME_KEYMAP_PRESETS.bgmi
    updateKeymapList(preset)
    addLog(`Reset ${selectedGame.title} keymap to default preset`, 'system')
  }

  const syncJoystickFromKeys = useCallback(() => {
    const k = keysRef.current
    let dx = 0
    let dy = 0
    if (k['KeyW'] || k['ArrowUp']) dy -= 1
    if (k['KeyS'] || k['ArrowDown']) dy += 1
    if (k['KeyA'] || k['ArrowLeft']) dx -= 1
    if (k['KeyD'] || k['ArrowRight']) dx += 1
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071
      dy *= 0.7071
    }
    const sprinting = Boolean(k['ShiftLeft'] || k['ShiftRight']) && (dx !== 0 || dy !== 0)
    setJoystickVec({ dx, dy, sprinting })

    if (dx !== 0 || dy !== 0) {
      emitMobileTouch({
        type: 'keymap-joystick',
        nx: 0.16,
        ny: 0.72,
        dx: sprinting ? dx * 1.4 : dx,
        dy: sprinting ? dy * 1.4 : dy,
      })
    }
  }, [emitMobileTouch])

  const executeMappedControl = useCallback((control, isDown) => {
    if (!control) return

    if (isDown) {
      triggerTouchRipple(control.x, control.y, control.label)
      setLastActionText(`${control.displayKey} → ${control.label} [ADB tap (${Math.round((control.x / 100) * 1920)}, ${Math.round((control.y / 100) * 1080)})]`)
      emitMobileTouch({
        type: 'keymap-tap',
        id: control.id,
        label: control.label,
        nx: control.x / 100,
        ny: control.y / 100,
      })
    }

    switch (control.id) {
      case 'fire':
        mouseRef.current.down = isDown
        if (isDown) mouseRef.current.clicked = true
        break
      case 'scope':
        if (isDown) {
          setScopeActive((prev) => {
            const next = !prev
            scopeRef.current = next
            return next
          })
        }
        break
      case 'peekL':
        if (isDown) {
          setLeanDir((prev) => {
            const next = prev === -1 ? 0 : -1
            leanRef.current = next
            return next
          })
        }
        break
      case 'peekR':
        if (isDown) {
          setLeanDir((prev) => {
            const next = prev === 1 ? 0 : 1
            leanRef.current = next
            return next
          })
        }
        break
      case 'crouch':
        if (isDown) {
          setStance((prev) => {
            const next = prev === 'CROUCH' ? 'STAND' : 'CROUCH'
            stanceRef.current = next
            return next
          })
        }
        break
      case 'prone':
        if (isDown) {
          setStance((prev) => {
            const next = prev === 'PRONE' ? 'STAND' : 'PRONE'
            stanceRef.current = next
            return next
          })
        }
        break
      case 'jump':
      case 'abilityQ':
        if (isDown) {
          stanceRef.current = 'STAND'
          setStance('STAND')
          gameActionRef.current.jump = control.id === 'abilityQ' ? 28 : 18
        }
        break
      case 'abilityC':
        if (isDown) {
          gameActionRef.current.smoke = { x: mouseRef.current.x, y: mouseRef.current.y, timer: 180 }
        }
        break
      case 'abilityE':
        if (isDown) {
          gameActionRef.current.dash = 20
        }
        break
      case 'ultX':
        if (isDown) {
          gameActionRef.current.ultActive = !gameActionRef.current.ultActive
        }
        break
      case 'spike':
        if (isDown) {
          gameActionRef.current.spikeProgress = 100
        }
        break
      case 'reload':
        if (isDown) gameActionRef.current.reload = true
        break
      case 'heal':
        if (isDown) gameActionRef.current.heal = true
        break
      case 'nade':
        if (isDown) gameActionRef.current.nade = true
        break
      case 'wpn1':
        if (isDown) {
          slotRef.current = 1
          setActiveSlot(1)
        }
        break
      case 'wpn2':
        if (isDown) {
          slotRef.current = 2
          setActiveSlot(2)
        }
        break
      default:
        break
    }
  }, [emitMobileTouch, triggerTouchRipple])

  useEffect(() => {
    if (sessionStatus !== 'active') return undefined

    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return

      if (rebindingId) {
        e.preventDefault()
        const newKey = e.code
        const newDisplay = formatKeyLabel(newKey)
        const updated = keymap.map((item) => (
          item.id === rebindingId ? { ...item, key: newKey, displayKey: newDisplay } : item
        ))
        updateKeymapList(updated)
        setRebindingId(null)
        addLog(`Rebound control to [${newDisplay}]`, 'success')
        return
      }

      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault()
      }

      if (keysRef.current[e.code]) return
      keysRef.current[e.code] = true
      setActiveKeys({ ...keysRef.current })

      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        syncJoystickFromKeys()
        setLastActionText(`${formatKeyLabel(e.code)} → BlueStacks Virtual Joystick Swipe`)
      }

      const matched = keymap.find((k) => k.key === e.code)
      if (matched) {
        executeMappedControl(matched, true)
      }
    }

    const onKeyUp = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      keysRef.current[e.code] = false
      setActiveKeys({ ...keysRef.current })

      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        syncJoystickFromKeys()
      }

      const matched = keymap.find((k) => k.key === e.code)
      if (matched) {
        executeMappedControl(matched, false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [sessionStatus, keymap, rebindingId, syncJoystickFromKeys, executeMappedControl, addLog])

  // Built-in 60 FPS Simulator (runs whenever BlueStacks window capture isn't active yet so PC controls work immediately!)
  const startMobileVmSimulation = useCallback((gameObj) => {
    if (gameLoopRafRef.current) cancelAnimationFrame(gameLoopRafRef.current)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    let score = 0
    let kills = 0
    let alive = gameObj.id === 'valorant' ? 5 : 64
    let hp = 100
    const maxAmmo = gameObj.id === 'valorant' ? 25 : 30
    let ammo = maxAmmo
    let recoilOffset = 0
    let worldX = 0
    let worldY = 0
    let lastShotAt = 0
    let statusBanner = ''
    let bannerTimer = 0
    let lastTime = performance.now()
    let frameCounter = 0
    let fpsTimer = performance.now()

    const enemies = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: 140 + Math.random() * (W - 280),
      y: 120 + Math.random() * (H - 250),
      vx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.4),
      hp: 100,
      maxHp: 100,
      shootTimer: 80 + Math.random() * 90,
    }))

    const particles = []
    const lootCrates = [
      { x: W * 0.66, y: H * 0.38, label: gameObj.id === 'valorant' ? 'Spike Site A [4]' : 'Level 3 Crate [F]' },
    ]

    const addParticles = (x, y, color, count = 12) => {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.3
        const s = 1.5 + Math.random() * 4.5
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color })
      }
    }

    const syncHud = () => {
      setHudStats({ score, kills, alive, hp: Math.max(0, Math.round(hp)), ammo, maxAmmo, statusBanner })
    }

    const render = (now) => {
      const dt = Math.min(32, now - lastTime) / 16.67
      lastTime = now
      frameCounter++
      if (now - fpsTimer >= 1000) {
        setFps(Math.min(60, Math.max(54, frameCounter)))
        frameCounter = 0
        fpsTimer = now
      }

      const k = keysRef.current
      const mouse = mouseRef.current
      const isScoped = scopeRef.current
      const lean = leanRef.current
      const currentStance = stanceRef.current

      if (bannerTimer > 0) {
        bannerTimer -= dt
        if (bannerTimer <= 0) statusBanner = ''
      }

      if (gameActionRef.current.reload) {
        gameActionRef.current.reload = false
        ammo = maxAmmo
        statusBanner = 'RELOADED MAGAZINE'
        bannerTimer = 50
        syncHud()
      }
      if (gameActionRef.current.heal) {
        gameActionRef.current.heal = false
        hp = Math.min(100, hp + 35)
        statusBanner = '+35 HP FIRST AID'
        bannerTimer = 50
        addParticles(W / 2, H - 60, '#74e7a8', 14)
        syncHud()
      }
      if (gameActionRef.current.spikeProgress > 0) {
        gameActionRef.current.spikeProgress = 0
        score += 300
        statusBanner = 'SPIKE PLANTED (+300 PTS)'
        bannerTimer = 90
        addParticles(W * 0.66, H * 0.38, '#a78bfa', 24)
        syncHud()
      }
      if (gameActionRef.current.dash > 0) {
        gameActionRef.current.dash = Math.max(0, gameActionRef.current.dash - dt)
        worldX = (worldX + 14 * dt) % 60
        statusBanner = 'TAILWIND DASH [E]'
        bannerTimer = 35
      }
      if (gameActionRef.current.nade) {
        gameActionRef.current.nade = false
        addParticles(mouse.x, mouse.y, '#f97316', 28)
        enemies.forEach((en) => {
          if (Math.hypot(en.x - mouse.x, en.y - mouse.y) < 130) {
            en.hp -= 85
          }
        })
      }

      const speedMult = currentStance === 'PRONE' ? 0.45 : currentStance === 'CROUCH' ? 0.7 : (k['ShiftLeft'] ? (gameObj.id === 'valorant' ? 0.55 : 1.45) : 1)
      let moveX = 0
      let moveY = 0
      if (k['KeyA'] || k['ArrowLeft']) moveX -= 3.2 * speedMult * dt
      if (k['KeyD'] || k['ArrowRight']) moveX += 3.2 * speedMult * dt
      if (k['KeyW'] || k['ArrowUp']) moveY -= 3.2 * speedMult * dt
      if (k['KeyS'] || k['ArrowDown']) moveY += 3.2 * speedMult * dt

      worldX = (worldX - moveX) % 60
      worldY = (worldY - moveY) % 60

      if (gameActionRef.current.jump > 0) {
        gameActionRef.current.jump = Math.max(0, gameActionRef.current.jump - dt)
      }
      const jumpOffset = Math.sin((gameActionRef.current.jump / 28) * Math.PI) * 32

      ctx.save()
      if (isScoped || lean !== 0) {
        ctx.translate(mouse.x, mouse.y)
        if (lean !== 0) ctx.rotate(lean * 0.11)
        if (isScoped) ctx.scale(1.45, 1.45)
        ctx.translate(-mouse.x, -mouse.y)
      }

      const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.48)
      if (gameObj.id === 'bgmi') {
        skyGrad.addColorStop(0, '#0f243c')
        skyGrad.addColorStop(1, '#1e3a5f')
      } else if (gameObj.id === 'valorant') {
        skyGrad.addColorStop(0, '#14112e')
        skyGrad.addColorStop(1, '#2b1f52')
      } else {
        skyGrad.addColorStop(0, '#090d1e')
        skyGrad.addColorStop(1, '#1a1638')
      }
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, H * 0.48 + jumpOffset)

      const groundGrad = ctx.createLinearGradient(0, H * 0.48, 0, H)
      if (gameObj.id === 'bgmi') {
        groundGrad.addColorStop(0, '#1b2e1e')
        groundGrad.addColorStop(1, '#0e1912')
      } else {
        groundGrad.addColorStop(0, '#12162d')
        groundGrad.addColorStop(1, '#080a16')
      }
      ctx.fillStyle = groundGrad
      ctx.fillRect(0, H * 0.48 + jumpOffset, W, H)

      ctx.strokeStyle = 'rgba(143, 234, 255, 0.08)'
      ctx.lineWidth = 1
      for (let gx = (worldX % 60) - 60; gx < W + 60; gx += 60) {
        ctx.beginPath()
        ctx.moveTo(gx, H * 0.48 + jumpOffset)
        ctx.lineTo((gx - W / 2) * 1.8 + W / 2, H)
        ctx.stroke()
      }
      for (let gy = H * 0.5 + ((worldY % 40) + 40) % 40; gy < H; gy += 40) {
        ctx.beginPath()
        ctx.moveTo(0, gy + jumpOffset)
        ctx.lineTo(W, gy + jumpOffset)
        ctx.stroke()
      }

      lootCrates.forEach((crate) => {
        const cx = crate.x + worldX * 0.4
        const cy = crate.y + jumpOffset
        ctx.fillStyle = gameObj.id === 'valorant' ? '#6d28d9' : '#b91c1c'
        ctx.fillRect(cx - 18, cy - 14, 36, 18)
        ctx.fillStyle = gameObj.id === 'valorant' ? '#38bdf8' : '#1d4ed8'
        ctx.fillRect(cx - 18, cy + 4, 36, 10)
        if (k['KeyF'] && gameObj.id === 'bgmi') {
          score += 50
          ammo = maxAmmo
          hp = Math.min(100, hp + 15)
          statusBanner = 'LOOTED LEVEL 3 CRATE (+AMMO & HP)'
          bannerTimer = 50
          addParticles(cx, cy, '#fde047', 12)
          syncHud()
        }
      })

      if (gameActionRef.current.smoke && gameActionRef.current.smoke.timer > 0) {
        const sm = gameActionRef.current.smoke
        sm.timer -= dt
        ctx.beginPath()
        ctx.arc(sm.x, sm.y + jumpOffset, 56, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(167, 139, 250, 0.45)'
        ctx.fill()
        ctx.strokeStyle = '#c4b5fd'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      const fireRateMs = slotRef.current === 1 ? 115 : 190
      if ((mouse.down || mouse.clicked) && now - lastShotAt >= fireRateMs) {
        lastShotAt = now
        if (ammo <= 0) {
          ammo = maxAmmo
        } else {
          if (!gameActionRef.current.ultActive) ammo--
          recoilOffset = Math.min(18, recoilOffset + (gameActionRef.current.ultActive ? 0.5 : isScoped ? 2.2 : 4.2))
          const aimX = mouse.x
          const aimY = mouse.y - recoilOffset

          addParticles(aimX, aimY, gameActionRef.current.ultActive ? '#67e8f9' : '#fde047', 5)

          for (let i = enemies.length - 1; i >= 0; i--) {
            const en = enemies[i]
            const ex = en.x
            const ey = en.y + jumpOffset
            const distHead = Math.hypot(aimX - ex, aimY - (ey - 16))
            const distBody = Math.hypot(aimX - ex, aimY - ey)

            if (distHead <= 14 || distBody <= 24) {
              const isHead = distHead <= 14
              const dmg = isHead || gameActionRef.current.ultActive ? 100 : (slotRef.current === 1 ? 40 : 55)
              en.hp -= dmg
              addParticles(aimX, aimY, isHead ? '#ef4444' : '#fbbf24', isHead ? 16 : 8)

              if (en.hp <= 0) {
                kills++
                if (gameObj.id === 'bgmi') alive = Math.max(1, alive - 1)
                score += isHead ? 180 : 120
                statusBanner = isHead ? 'HEADSHOT ELIMINATION (+180)' : 'TARGET ELIMINATED (+120)'
                bannerTimer = 45
                if (gameActionRef.current.ultActive) ammo = maxAmmo
                addParticles(ex, ey, '#74e7a8', 20)
                en.x = 120 + Math.random() * (W - 240)
                en.y = 110 + Math.random() * (H - 230)
                en.hp = 100
              }
              break
            }
          }
          syncHud()
        }
      }

      recoilOffset = Math.max(0, recoilOffset - 0.6 * dt)

      enemies.forEach((en) => {
        en.x += (en.vx - moveX * 0.35) * dt
        if (en.x < 90 || en.x > W - 90) en.vx *= -1

        en.shootTimer -= dt
        if (en.shootTimer <= 0) {
          en.shootTimer = 95 + Math.random() * 80
          const hitChance = currentStance === 'PRONE' ? 0.15 : currentStance === 'CROUCH' ? 0.25 : 0.38
          if (Math.random() < hitChance) {
            hp = Math.max(15, hp - 4)
            syncHud()
          }
        }

        const ex = en.x
        const ey = en.y + jumpOffset

        ctx.fillStyle = gameObj.id === 'valorant' ? '#3b0764' : '#334155'
        ctx.beginPath()
        ctx.roundRect(ex - 13, ey - 8, 26, 32, 6)
        ctx.fill()
        ctx.strokeStyle = gameObj.id === 'valorant' ? '#a855f7' : '#f97316'
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(ex, ey - 16, 10, 0, Math.PI * 2)
        ctx.fillStyle = '#e2e8f0'
        ctx.fill()
        ctx.strokeStyle = '#38bdf8'
        ctx.stroke()

        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        ctx.fillRect(ex - 20, ey - 34, 40, 5)
        ctx.fillStyle = en.hp > 40 ? '#22c55e' : '#ef4444'
        ctx.fillRect(ex - 20, ey - 34, 40 * Math.max(0, en.hp / en.maxHp), 5)
      })

      for (let p = particles.length - 1; p >= 0; p--) {
        const pt = particles[p]
        pt.x += pt.vx * dt
        pt.y += pt.vy * dt
        pt.life -= 0.04 * dt
        if (pt.life <= 0) {
          particles.splice(p, 1)
          continue
        }
        ctx.globalAlpha = Math.max(0, pt.life)
        ctx.fillStyle = pt.color
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.restore()

      if (statusBanner) {
        ctx.fillStyle = 'rgba(14, 18, 38, 0.85)'
        ctx.fillRect(W / 2 - 140, 56, 280, 28)
        ctx.fillStyle = '#74e7a8'
        ctx.font = 'bold 12px "DM Mono", monospace'
        ctx.textAlign = 'center'
        ctx.fillText(statusBanner, W / 2, 74)
      }

      const cx = mouse.x
      const cy = mouse.y - recoilOffset
      if (isScoped) {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, 68, 0, Math.PI * 2)
        ctx.moveTo(cx - 85, cy)
        ctx.lineTo(cx + 85, cy)
        ctx.moveTo(cx, cy - 85)
        ctx.lineTo(cx, cy + 85)
        ctx.stroke()
      } else {
        ctx.strokeStyle = gameActionRef.current.ultActive ? '#67e8f9' : '#74e7a8'
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.arc(cx, cy, 8 + recoilOffset * 0.5, 0, Math.PI * 2)
        ctx.moveTo(cx - 16, cy)
        ctx.lineTo(cx - 5, cy)
        ctx.moveTo(cx + 5, cy)
        ctx.lineTo(cx + 16, cy)
        ctx.moveTo(cx, cy - 16)
        ctx.lineTo(cx, cy - 5)
        ctx.moveTo(cx, cy + 5)
        ctx.lineTo(cx, cy + 16)
        ctx.stroke()

        const gunX = W * 0.62 + (cx - W / 2) * 0.15 + lean * 24
        const gunY = H - (currentStance === 'PRONE' ? 28 : currentStance === 'CROUCH' ? 42 : 55) + recoilOffset
        ctx.fillStyle = gameActionRef.current.ultActive ? '#0e7490' : slotRef.current === 1 ? '#1e293b' : '#312e81'
        ctx.strokeStyle = '#8feaff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(gunX, gunY, 120, 70, 8)
        ctx.fill()
        ctx.stroke()
      }

      mouse.clicked = false
      gameLoopRafRef.current = requestAnimationFrame(render)
    }

    syncHud()
    gameLoopRafRef.current = requestAnimationFrame(render)
  }, [])

  useEffect(() => {
    const shouldRunCanvas =
      sessionStatus === 'active' &&
      (vmBackendMode === 'mobile-vm-sim' || (vmBackendMode === 'bluestacks-live' && !hasBlueStacksStream))

    if (shouldRunCanvas) {
      startMobileVmSimulation(selectedGame)
    } else if (gameLoopRafRef.current) {
      cancelAnimationFrame(gameLoopRafRef.current)
      gameLoopRafRef.current = null
    }
    return () => {
      if (gameLoopRafRef.current) cancelAnimationFrame(gameLoopRafRef.current)
    }
  }, [sessionStatus, vmBackendMode, hasBlueStacksStream, selectedGame, startMobileVmSimulation])

  const initSignaling = useCallback((role = 'viewer', gameObj = selectedGame) => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    const roomId = getRoomId(gameObj)
    const socket = io(signalingEndpoint, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    })

    socket.on('connect', () => {
      addLog(`Connected to BlueStacks ADB Bridge (127.0.0.1:5555) via ${signalingEndpoint}`, 'success')
      setConnectionState('connected')
      socket.emit('join-room', { roomId, role })
      socket.emit('vm-launch-game', {
        roomId,
        title: gameObj.title,
        executable: gameObj.executable,
        androidPackage: gameObj.androidPackage,
      })
      addLog(`Active PC Keymapper Profile: "${gameObj.presetName}"`, 'system')
    })

    socket.on('vm-telemetry', (telemetry) => {
      if (telemetry) setVmTelemetry(telemetry)
    })

    socket.on('vm-agent-status', ({ message }) => {
      if (message) addLog(message, 'success')
    })

    socketRef.current = socket
  }, [addLog, getRoomId, selectedGame, signalingEndpoint])

  // Stream the running BlueStacks.app window directly into the Night Arena viewport at 60 FPS
  const streamBlueStacksWindow = async () => {
    try {
      addLog('Select your "BlueStacks" window in the macOS prompt to embed it inside Night Arena...', 'system')
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      })
      localStreamRef.current = stream
      setHasBlueStacksStream(true)
      setVmBackendMode('bluestacks-live')
      if (sessionStatus !== 'active') {
        completeBootNow()
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      addLog('BlueStacks window embedded live at 60 FPS with PC Keymapper overlay + ADB 127.0.0.1:5555 touch bridge!', 'success')
      stream.getVideoTracks()[0].onended = () => {
        setHasBlueStacksStream(false)
        addLog('BlueStacks window stream stopped — switched to interactive keymap simulator', 'warning')
      }
    } catch (err) {
      addLog(`Window selection skipped (${err.message}) — running interactive keymap simulator + ADB bridge`, 'warning')
    }
  }

  const clearBootTimers = () => {
    if (bootTimerRef.current) clearTimeout(bootTimerRef.current)
    if (bootRafRef.current) cancelAnimationFrame(bootRafRef.current)
  }

  const startSession = async (autoCaptureWindow = false) => {
    clearBootTimers()
    setSessionStatus('connecting')
    setBootProgress(0)
    setCurrentStage(0)
    setLogs([])
    setError(null)
    addLog(`Connecting to BlueStacks (/Applications/BlueStacks.app) on 127.0.0.1:5555...`, 'system')

    try {
      const data = await sessionsApi.provisionVm(selectedGame.title, selectedGame.androidPackage, streamQuality, 'bluestacks')
      if (data?.session?.sessionId) {
        setVmSessionId(data.session.sessionId)
      }
      if (data?.telemetry) {
        setVmTelemetry(data.telemetry)
      }
      addLog(`BlueStacks ADB launched ${selectedGame.androidPackage} on 127.0.0.1:5555`, 'success')
    } catch {
      addLog(`BlueStacks bridge active on 127.0.0.1:5555`, 'system')
    }

    if (autoCaptureWindow) {
      await streamBlueStacksWindow()
      return
    }

    const stages = [
      { label: 'Connecting to BlueStacks ADB (127.0.0.1:5555)' },
      { label: `Launching ${selectedGame.androidPackage} in BlueStacks` },
      { label: `Applying "${selectedGame.presetName}" PC Keymapper` },
      { label: 'Activating WASD Thumbstick & Mouse Touch Bridge' },
    ]

    const runStage = (i) => {
      if (i >= stages.length) {
        completeBootNow()
        return
      }
      setCurrentStage(i)
      addLog(stages[i].label, 'stage')
      const start = (i / stages.length) * 100
      const end = ((i + 1) / stages.length) * 100
      let progress = start
      const animate = () => {
        progress += (end - start) / 8
        if (progress >= end) {
          setBootProgress(end)
          bootTimerRef.current = setTimeout(() => runStage(i + 1), 70)
        } else {
          setBootProgress(progress)
          bootRafRef.current = requestAnimationFrame(animate)
        }
      }
      animate()
    }
    runStage(0)
  }

  const completeBootNow = () => {
    clearBootTimers()
    setBootProgress(100)
    setSessionStatus('active')
    setConnectionState('connected')
    initSignaling('viewer', selectedGame)
    if (timerRef.current) clearInterval(timerRef.current)
    setSessionTime(0)
    timerRef.current = setInterval(() => {
      setSessionTime((t) => t + 1)
    }, 1000)
  }

  const endSession = () => {
    clearBootTimers()
    if (gameLoopRafRef.current) cancelAnimationFrame(gameLoopRafRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    setHasBlueStacksStream(false)
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    if (hudStats.score > 0) {
      updateStats(hudStats.score, hudStats.kills, hudStats.score)
    }
    if (vmSessionId) {
      sessionsApi.terminateVm(vmSessionId).catch(() => {})
      setVmSessionId(null)
    }
    setSessionStatus('ready')
    setConnectionState('disconnected')
    addLog('BlueStacks session ended & stats saved', 'warning')
  }

  const handleViewportMouseMove = (e) => {
    if (!viewportRef.current) return
    const rect = viewportRef.current.getBoundingClientRect()
    const nx = Math.max(4, Math.min(96, ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100))
    const ny = Math.max(6, Math.min(94, ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100))

    if (editingKeymap && draggingId) {
      const next = keymap.map((item) => (
        item.id === draggingId ? { ...item, x: Math.round(nx), y: Math.round(ny) } : item
      ))
      updateKeymapList(next)
      return
    }

    mouseRef.current.x = (nx / 100) * 800
    mouseRef.current.y = (ny / 100) * 430
  }

  const handleViewportMouseDown = (e) => {
    if (editingKeymap) return
    handleViewportMouseMove(e)
    if (e.button === 0) {
      const fireCtrl = keymap.find((k) => k.id === 'fire')
      if (fireCtrl) executeMappedControl(fireCtrl, true)
    } else if (e.button === 2) {
      const scopeCtrl = keymap.find((k) => k.id === 'scope')
      if (scopeCtrl) executeMappedControl(scopeCtrl, true)
    }
  }

  const handleViewportMouseUp = (e) => {
    if (draggingId) {
      setDraggingId(null)
      return
    }
    if (e.button === 0) {
      mouseRef.current.down = false
    }
  }

  const toggleFullscreen = () => {
    if (!viewportRef.current) return
    if (!document.fullscreenElement) {
      viewportRef.current.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  useEffect(() => {
    return () => {
      clearBootTimers()
      if (gameLoopRafRef.current) cancelAnimationFrame(gameLoopRafRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (socketRef.current) socketRef.current.disconnect()
    }
  }, [])

  return (
    <section className="arena-page">
      <div className="arena-page-heading">
        <div>
          <p className="eyebrow">NIGHT ARENA · BLUESTACKS MACOS INTEGRATION (PORT 5555)</p>
          <h1>Your BlueStacks,<br /><span>inside your website.</span></h1>
          <p>Connected directly to <code>/Applications/BlueStacks.app</code> on port <code>5555</code>. Launch <strong>BGMI</strong> or <strong>Valorant</strong> in BlueStacks, embed the live BlueStacks window right into this page, and play with our custom PC Keymapper overlay.</p>
        </div>
        <div className={`session-badge ${sessionStatus} connected`}>
          <span></span>
          {vmTelemetry.bluestacksRunning !== false
            ? 'BLUESTACKS LIVE · PORT 5555'
            : 'BLUESTACKS STANDBY · PORT 5555'}
        </div>
      </div>

      <div className="vm-config-bar">
        <div className="vm-config-group">
          <span className="toolbar-label">BLUESTACKS DISPLAY MODE</span>
          <div className="toolbar-pills">
            <button
              type="button"
              className={`toolbar-pill ${vmBackendMode === 'bluestacks-live' && hasBlueStacksStream ? 'active' : ''}`}
              onClick={streamBlueStacksWindow}
            >
              🔵 {hasBlueStacksStream ? 'Streaming BlueStacks Window (60 FPS)' : 'Embed Running BlueStacks Window'}
            </button>
            <button
              type="button"
              className={`toolbar-pill ${vmBackendMode === 'mobile-vm-sim' || !hasBlueStacksStream ? 'active' : ''}`}
              onClick={() => { setHasBlueStacksStream(false); setVmBackendMode('mobile-vm-sim') }}
            >
              🎮 Built-in 60 FPS Keymap Trainer
            </button>
            <button
              type="button"
              className={`toolbar-pill ${vmBackendMode === 'android-vnc' ? 'active' : ''}`}
              onClick={() => setVmBackendMode('android-vnc')}
            >
              🤖 Docker-Android VNC (:6080)
            </button>
          </div>
        </div>

        <div className="vm-config-group">
          <span className="toolbar-label">PC KEYMAPPER</span>
          <div className="toolbar-pills">
            <button
              type="button"
              className={`toolbar-pill ${showKeymapOverlay ? 'active' : ''}`}
              onClick={() => setShowKeymapOverlay((v) => !v)}
            >
              👁️ Keymap HUD: {showKeymapOverlay ? 'Shown' : 'Hidden'}
            </button>
            <button
              type="button"
              className={`toolbar-pill ${editingKeymap ? 'active' : ''}`}
              onClick={() => { setEditingKeymap((v) => !v); setRebindingId(null) }}
            >
              🛠️ {editingKeymap ? 'Done Editing' : 'Drag / Rebind Keys'}
            </button>
            {editingKeymap && (
              <button type="button" className="toolbar-pill" onClick={resetDefaultKeymap}>
                ↺ Reset Preset
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="arena-dashboard">
        <div className="game-library">
          <div className="panel-title"><span>BLUESTACKS APPS</span><small>ADB :5555</small></div>
          {games.map((game) => (
            <button
              key={game.title}
              type="button"
              className={`arena-game ${game.accent} ${selectedGame.title === game.title ? 'selected' : ''}`}
              onClick={() => {
                setSelectedGame(game)
                if (sessionStatus === 'active') {
                  sessionsApi.provisionVm(game.title, game.androidPackage, streamQuality, 'bluestacks').catch(() => {})
                  addLog(`Switched BlueStacks APK to ${game.androidPackage} (${game.presetName})`, 'system')
                }
              }}
            >
              <i>{game.icon}</i>
              <span>
                <strong>{game.title}</strong>
                <small>{game.presetName}</small>
              </span>
              <b>›</b>
            </button>
          ))}
        </div>

        <div className="session-panel">
          <div className="panel-title">
            <span>BLUESTACKS BRIDGE · 127.0.0.1:5555 ({selectedGame.androidPackage})</span>
            <small>
              {editingKeymap
                ? '● DRAG ANY KEY NODE OR CLICK TO REBIND'
                : `● ${lastActionText} (${inputCount} ADB EVENTS)`}
            </small>
          </div>

          <div
            ref={viewportRef}
            className={`game-display ${selectedGame.accent} ${sessionStatus === 'active' ? 'is-live' : ''}`}
            onMouseMove={handleViewportMouseMove}
            onMouseDown={handleViewportMouseDown}
            onMouseUp={handleViewportMouseUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            {sessionStatus === 'connecting' && (
              <div className="boot-overlay">
                <div className="boot-progress-ring" style={{ '--progress': `${bootProgress}%` }}>
                  <span className="boot-percent">{Math.round(bootProgress)}%</span>
                </div>
                <p className="boot-stage">
                  {['Connecting BlueStacks :5555', `Opening ${selectedGame.androidPackage}`, 'Applying PC Keymapper', 'Binding ADB Touch Bridge'][currentStage] || 'Starting...'}
                </p>
                <div className="boot-bar">
                  <div className="boot-bar-fill" style={{ width: `${bootProgress}%` }}></div>
                </div>
                <button type="button" className="outline-button" onClick={completeBootNow} style={{ marginTop: '8px' }}>
                  Instant Launch →
                </button>
              </div>
            )}

            {sessionStatus === 'active' && (
              <div className="vm-live-container">
                {vmBackendMode === 'android-vnc' ? (
                  <iframe
                    src={androidVncUrl}
                    title="Android Cloud VM"
                    className="vm-direct-iframe"
                    allow="autoplay; fullscreen; gamepad"
                  />
                ) : hasBlueStacksStream ? (
                  <video ref={videoRef} autoPlay playsInline className="stream-video" />
                ) : (
                  <canvas ref={canvasRef} width={800} height={430} className="vm-interactive-canvas" />
                )}

                <div className="vm-hud-top">
                  <div className="vm-hud-pill">
                    <strong>{selectedGame.title}</strong>
                    <span>{hasBlueStacksStream ? 'BLUESTACKS LIVE WINDOW' : (selectedGame.id === 'valorant' ? '5V5 ASCENT' : `ALIVE ${hudStats.alive}/100`)}</span>
                  </div>
                  <div className="vm-hud-metrics">
                    <span>STANCE <strong>{stance}</strong></span>
                    <span>MODE <strong>{scopeActive ? 'ADS ZOOM' : 'HIPFIRE'}</strong></span>
                    <span>ADB <strong>127.0.0.1:5555</strong></span>
                    <span>TIME <strong>{formatTime(sessionTime)}</strong></span>
                  </div>
                </div>

                {showKeymapOverlay && (
                  <div className={`pc-keymap-layer ${editingKeymap ? 'is-editing' : ''}`}>
                    <div
                      className={`virtual-joystick-ring ${joystickVec.dx !== 0 || joystickVec.dy !== 0 ? 'is-moving' : ''}`}
                      style={{ left: '16%', top: '72%' }}
                    >
                      <span className="joy-key joy-w">W</span>
                      <span className="joy-key joy-a">A</span>
                      <span className="joy-key joy-s">S</span>
                      <span className="joy-key joy-d">D</span>
                      <div
                        className={`virtual-joystick-puck ${joystickVec.sprinting ? 'sprinting' : ''}`}
                        style={{
                          transform: `translate(${joystickVec.dx * 22}px, ${joystickVec.dy * 22}px)`
                        }}
                      />
                      <small className="joy-sprint-hint">{selectedGame.id === 'valorant' ? 'Shift = Walk' : 'Shift = Sprint'}</small>
                    </div>

                    {keymap.map((ctrl) => {
                      const isPressed =
                        activeKeys[ctrl.key] ||
                        (ctrl.id === 'scope' && scopeActive) ||
                        (ctrl.id === 'peekL' && leanDir === -1) ||
                        (ctrl.id === 'peekR' && leanDir === 1) ||
                        (ctrl.id === 'crouch' && stance === 'CROUCH') ||
                        (ctrl.id === 'prone' && stance === 'PRONE') ||
                        (ctrl.id === 'wpn1' && activeSlot === 1) ||
                        (ctrl.id === 'wpn2' && activeSlot === 2)

                      return (
                        <button
                          key={ctrl.id}
                          type="button"
                          className={`keymap-node ${ctrl.type} ${isPressed ? 'is-pressed' : ''} ${rebindingId === ctrl.id ? 'is-rebinding' : ''}`}
                          style={{ left: `${ctrl.x}%`, top: `${ctrl.y}%` }}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            if (editingKeymap) {
                              setDraggingId(ctrl.id)
                            } else {
                              executeMappedControl(ctrl, true)
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (editingKeymap) {
                              setRebindingId(ctrl.id)
                            }
                          }}
                          title={`${ctrl.label} (${ctrl.displayKey})`}
                        >
                          <strong className="keymap-key">{rebindingId === ctrl.id ? 'Press Key...' : ctrl.displayKey}</strong>
                          <span className="keymap-label">{ctrl.label}</span>
                        </button>
                      )
                    })}

                    {touchRipples.map((r) => (
                      <span
                        key={r.id}
                        className="touch-ripple"
                        style={{ left: `${r.x}%`, top: `${r.y}%` }}
                      />
                    ))}
                  </div>
                )}

                <div className="vm-hud-bottom">
                  <span className="vm-controls-hint">{selectedGame.controls}</span>
                  <div className="vm-telemetry-badges">
                    <span>BLUESTACKS :5555</span>
                    <span>{latency} ms</span>
                    <span>{fps} FPS</span>
                  </div>
                </div>
              </div>
            )}

            {sessionStatus === 'ready' && (
              <>
                <p>BLUESTACKS DETECTED ON PORT 5555 · {selectedGame.presetName.toUpperCase()}</p>
                <i>{selectedGame.icon}</i>
                <h2>{selectedGame.title}</h2>
                <span>{selectedGame.controls}</span>
              </>
            )}
          </div>

          {selectedGame.id === 'valorant' ? (
            <div className="pc-specs keymap-spec-grid">
              <div><span>MOVE / WALK</span><strong>WASD + Shift (Silent Walk)</strong></div>
              <div><span>FIRE / ADS</span><strong>L-Click (Vandal) · R-Click (ADS)</strong></div>
              <div><span>ABILITIES</span><strong>C (Smoke) · Q (Updraft) · E (Dash)</strong></div>
              <div><span>ULTIMATE / SPIKE</span><strong>X (Blade Storm) · 4 (Plant Spike)</strong></div>
              <div><span>STANCE / RELOAD</span><strong>Space (Jump) · Ctrl (Crouch) · R</strong></div>
              <div><span>BLUESTACKS ADB</span><strong>127.0.0.1:5555 (Connected)</strong></div>
            </div>
          ) : (
            <div className="pc-specs keymap-spec-grid">
              <div><span>MOVE / SPRINT</span><strong>WASD + Shift (Joystick)</strong></div>
              <div><span>AIM & FIRE</span><strong>Mouse + L-Click (Fire)</strong></div>
              <div><span>SCOPE / ADS</span><strong>Right-Click (4x Toggle)</strong></div>
              <div><span>PEEK / LEAN</span><strong>Q (Left) · E (Right)</strong></div>
              <div><span>STANCE</span><strong>Space (Jump) · C (Crouch) · Z (Prone)</strong></div>
              <div><span>BLUESTACKS ADB</span><strong>127.0.0.1:5555 (Connected)</strong></div>
            </div>
          )}

          <div className="console-controls">
            {sessionStatus === 'ready' && (
              <div className="active-controls">
                <button className="launch-button primary" type="button" onClick={() => startSession(false)}>
                  Launch {selectedGame.title} in BlueStacks →
                </button>
                <button className="outline-button" type="button" onClick={() => startSession(true)}>
                  🔵 Launch & Embed BlueStacks Window in Website
                </button>
              </div>
            )}
            {sessionStatus === 'connecting' && (
              <button className="launch-button secondary" type="button" onClick={endSession}>
                Cancel Boot ✕
              </button>
            )}
            {sessionStatus === 'active' && (
              <div className="active-controls">
                <button className="launch-button danger" type="button" onClick={endSession}>
                  End Session
                </button>
                <button className="outline-button" type="button" onClick={streamBlueStacksWindow}>
                  🔵 {hasBlueStacksStream ? 'Switch Captured Window' : 'Embed BlueStacks Window Here'}
                </button>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => { setEditingKeymap((v) => !v); setRebindingId(null) }}
                >
                  🛠️ {editingKeymap ? 'Save Keymap Layout' : 'Customize PC Keymap'}
                </button>
                <button className="outline-button" type="button" onClick={toggleFullscreen}>
                  ⛶ Fullscreen
                </button>
              </div>
            )}
          </div>

          <div className="console-log" ref={logRef}>
            <div className="log-header">
              <span>BLUESTACKS ADB (127.0.0.1:5555) & KEYMAPPER LOG</span>
              <span className="log-status connected">
                {sessionStatus === 'active' ? 'ADB 5555 ACTIVE' : 'BLUESTACKS READY'}
              </span>
            </div>
            <div className="log-entries">
              {logs.length === 0 && (
                <p className="log-empty">BlueStacks is running on port 5555. Click Launch to open the APK and activate PC controls.</p>
              )}
              {logs.map((log) => (
                <div key={log.id} className={`log-entry ${log.type}`}>
                  <span className="log-time">[{log.time}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <span>⚠</span>
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">×</button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default NightArena
