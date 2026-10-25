import React, { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useGameStats } from '../hooks/useGameStats'

const wordBanks = {
  cosmos: {
    label: '🌌 Cosmos',
    words: [
      'galaxy', 'nebula', 'asteroid', 'comet', 'planet', 'rocket', 'orbit', 'gravity',
      'universe', 'satellite', 'meteor', 'cosmos', 'lunar', 'solar', 'eclipse', 'horizon',
      'starlight', 'supernova', 'pulsar', 'quasar', 'constellation', 'voyager', 'apogee', 'zenith',
      'aurora', 'telescope', 'equinox', 'parsec', 'photon', 'celestial', 'infinity', 'lightyear'
    ]
  },
  code: {
    label: '💻 Code & Tech',
    words: [
      'react', 'component', 'function', 'variable', 'promise', 'async', 'await', ' hook',
      'state', 'props', 'context', 'router', 'terminal', 'compiler', 'database', 'protocol',
      'interface', 'algorithm', 'frontend', 'backend', 'socket', 'payload', 'middleware', 'closures',
      'pipeline', 'deployment', 'viewport', 'animation', 'keyframe', 'selector', 'grid', 'module'
    ].map((w) => w.trim())
  },
  speed: {
    label: '⚡ Speed Burst',
    words: [
      'fast', 'code', 'glow', 'byte', 'node', 'flux', 'neon', 'sync',
      'dash', 'beam', 'core', 'loop', 'wave', 'peak', 'rush', 'spark',
      'dark', 'moon', 'star', 'void', 'time', 'play', 'zone', 'grid',
      'jump', 'link', 'warp', 'zero', 'ping', 'data', 'flow', 'echo'
    ]
  },
  master: {
    label: '🏛️ Challenge',
    words: [
      'architecture', 'asynchronous', 'cryptography', 'virtualization', 'infrastructure',
      'cybernetics', 'constellation', 'interstellar', 'observatory', 'luminescence',
      'orchestration', 'authentication', 'microservices', 'concurrency', 'optimization',
      'accidental', 'chronological', 'metamorphic', 'stratosphere', 'thermodynamics'
    ]
  }
}

const timeModes = [15, 30, 60]

const learningGames = [
  { title: 'Memory Match', to: '/learning', icon: '🧠', end: true },
  { title: 'Type Sprint', to: '/learning/typesprint', icon: '⌨️' },
  { title: 'Math Quest', to: '/learning/mathquest', icon: '🧮' },
]

function getRandomWords(category, count = 24) {
  const pool = wordBanks[category]?.words || wordBanks.cosmos.words
  const result = []
  while (result.length < count) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    for (const w of shuffled) {
      if (result.length < count && result[result.length - 1] !== w) {
        result.push(w)
      }
    }
  }
  return result
}

function getRankBadge(wpm) {
  if (wpm >= 80) return { icon: '🚀', title: 'Cosmic Grandmaster', tone: 'gold' }
  if (wpm >= 60) return { icon: '⚡', title: 'Cyber Sprinter', tone: 'cyan' }
  if (wpm >= 40) return { icon: '🌟', title: 'Star Navigator', tone: 'violet' }
  return { icon: '🌙', title: 'Night Cadet', tone: 'blue' }
}

function TypeSprint() {
  const { updateStats } = useGameStats('typesprint')
  const [category, setCategory] = useState('cosmos')
  const [duration, setDuration] = useState(60)
  const [targetWords, setTargetWords] = useState(() => getRandomWords('cosmos', 24))
  const [wordHistory, setWordHistory] = useState([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [score, setScore] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [rawWpm, setRawWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [wordsCompleted, setWordsCompleted] = useState(0)
  const [wordMistakes, setWordMistakes] = useState(0)
  const [highScores, setHighScores] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('night-hours-typesprint') || '[]')
    } catch {
      return []
    }
  })

  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const totalTypedRef = useRef(0)
  const correctTypedRef = useRef(0)
  const scoreRef = useRef(0)
  const bestStreakRef = useRef(0)
  const gameEndedRef = useRef(false)

  const currentWord = targetWords[currentWordIndex] || 'galaxy'
  const multiplier = streak >= 20 ? 3 : streak >= 10 ? 2 : streak >= 5 ? 1.5 : 1

  const saveScore = (finalWpm, finalAcc, finalScore, modeDuration, modeCategory) => {
    try {
      const scores = JSON.parse(localStorage.getItem('night-hours-typesprint') || '[]')
      scores.push({
        wpm: finalWpm,
        accuracy: finalAcc,
        score: finalScore,
        duration: modeDuration,
        category: modeCategory,
        date: new Date().toISOString()
      })
      scores.sort((a, b) => b.wpm - a.wpm || (b.score || 0) - (a.score || 0))
      const topScores = scores.slice(0, 10)
      localStorage.setItem('night-hours-typesprint', JSON.stringify(topScores))
      setHighScores(topScores)
    } catch {
      // Ignore storage errors
    }
  }

  const finishGame = () => {
    if (gameEndedRef.current) return
    gameEndedRef.current = true
    setFinished(true)
    const elapsedMinutes = Math.max((Date.now() - (startTimeRef.current || Date.now())) / 60000, 1 / 60000)
    const finalWpm = Math.round((correctTypedRef.current / 5) / elapsedMinutes) || 0
    const finalRaw = Math.round((totalTypedRef.current / 5) / elapsedMinutes) || 0
    const finalAccuracy = totalTypedRef.current > 0
      ? Math.round((correctTypedRef.current / totalTypedRef.current) * 100)
      : 100
    setWpm(finalWpm)
    setRawWpm(finalRaw)
    setAccuracy(finalAccuracy)
    saveScore(finalWpm, finalAccuracy, scoreRef.current, duration, category)
    updateStats(scoreRef.current, Math.max(finalWpm, bestStreakRef.current), scoreRef.current)
  }

  useEffect(() => {
    if (!started || finished) return undefined

    timerRef.current = window.setInterval(() => {
      if (startTimeRef.current) {
        const elapsedMinutes = Math.max((Date.now() - startTimeRef.current) / 60000, 1 / 60000)
        setWpm(Math.round((correctTypedRef.current / 5) / elapsedMinutes) || 0)
        setRawWpm(Math.round((totalTypedRef.current / 5) / elapsedMinutes) || 0)
      }

      setTimeLeft((time) => {
        if (time <= 1) {
          clearInterval(timerRef.current)
          finishGame()
          return 0
        }
        return time - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [started, finished])

  const startGame = () => {
    if (started) return
    startTimeRef.current = Date.now()
    setStarted(true)
  }

  const submitWord = (typedWord) => {
    const typed = typedWord.trim()
    if (!typed || finished) return

    const correctCharacters = [...currentWord].reduce(
      (total, character, index) => total + (typed[index] === character ? 1 : 0),
      0
    )
    const isCorrect = typed === currentWord

    // Include space keystroke in character totals for realistic WPM calculation
    totalTypedRef.current += typed.length + 1
    correctTypedRef.current += correctCharacters + (isCorrect ? 1 : 0)

    if (isCorrect) {
      setWordsCompleted((c) => c + 1)
      setStreak((s) => {
        const nextStreak = s + 1
        setBestStreak((b) => {
          const nextBest = Math.max(b, nextStreak)
          bestStreakRef.current = nextBest
          return nextBest
        })
        const nextMult = nextStreak >= 20 ? 3 : nextStreak >= 10 ? 2 : nextStreak >= 5 ? 1.5 : 1
        const gained = Math.round(currentWord.length * 10 * nextMult)
        setScore((currentScore) => {
          const nextScore = currentScore + gained
          scoreRef.current = nextScore
          return nextScore
        })
        return nextStreak
      })
    } else {
      setWordMistakes((m) => m + 1)
      setStreak(0)
    }

    setWordHistory((prev) => [...prev.slice(-14), { word: currentWord, typed, correct: isCorrect }])

    const elapsedMinutes = Math.max((Date.now() - startTimeRef.current) / 60000, 1 / 60000)
    setWpm(Math.round((correctTypedRef.current / 5) / elapsedMinutes))
    setRawWpm(Math.round((totalTypedRef.current / 5) / elapsedMinutes))
    setAccuracy(Math.round((correctTypedRef.current / totalTypedRef.current) * 100))

    if (currentWordIndex >= targetWords.length - 8) {
      setTargetWords((prev) => [...prev, ...getRandomWords(category, 16)])
    }
    setCurrentWordIndex((index) => index + 1)
    setUserInput('')
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    if (value.endsWith(' ')) {
      submitWord(value)
      return
    }
    setUserInput(value)

    if (!started && value.length > 0) startGame()

    if (value === currentWord) {
      submitWord(value)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      submitWord(userInput)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      restartGame(category, duration)
    }
  }

  const restartGame = (nextCategory = category, nextDuration = duration) => {
    clearInterval(timerRef.current)
    setTargetWords(getRandomWords(nextCategory, 24))
    setWordHistory([])
    setCurrentWordIndex(0)
    setUserInput('')
    setStarted(false)
    setFinished(false)
    setTimeLeft(nextDuration)
    setScore(0)
    setWpm(0)
    setRawWpm(0)
    setAccuracy(100)
    setStreak(0)
    setBestStreak(0)
    setWordsCompleted(0)
    setWordMistakes(0)
    totalTypedRef.current = 0
    correctTypedRef.current = 0
    scoreRef.current = 0
    bestStreakRef.current = 0
    gameEndedRef.current = false
    window.setTimeout(() => inputRef.current?.focus(), 20)
  }

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory)
    restartGame(newCategory, duration)
  }

  const handleDurationChange = (newDuration) => {
    setDuration(newDuration)
    restartGame(category, newDuration)
  }

  const renderActiveWord = () => {
    const chars = [...currentWord]
    const extraChars = userInput.length > currentWord.length
      ? [...userInput.slice(currentWord.length)]
      : []

    return (
      <>
        {chars.map((char, i) => {
          let cls = 'pending'
          if (i < userInput.length) {
            cls = userInput[i] === char ? 'correct' : 'wrong'
          } else if (i === userInput.length) {
            cls = 'current'
          }
          return (
            <span key={i} className={cls}>
              {char}
            </span>
          )
        })}
        {extraChars.map((char, idx) => (
          <span key={`extra-${idx}`} className="wrong extra">
            {char}
          </span>
        ))}
      </>
    )
  }

  const timePercent = Math.max(0, Math.min(100, (timeLeft / duration) * 100))
  const isLowTime = started && !finished && timeLeft <= 10
  const rank = getRankBadge(wpm)

  return (
    <section className="learning-page">
      <nav className="zone-subnav" aria-label="Learning Hours games">
        {learningGames.map((game) => (
          <NavLink key={game.to} to={game.to} end={game.end} className="zone-pill">
            <span>{game.icon}</span>
            <span>{game.title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="game-intro">
        <div>
          <p className="eyebrow">LEARNING HOURS · GAME 02</p>
          <h1>Type <span>Sprint.</span></h1>
          <p>Race the clock across themed word streams. Build accuracy streaks to unlock up to a 3x score multiplier.</p>
        </div>
        <div className="game-stats typesprint-top-stats" aria-label="Game stats">
          <div>
            <span>TIME</span>
            <strong className={isLowTime ? 'low-time' : ''}>{timeLeft}s</strong>
          </div>
          <div>
            <span>NET WPM</span>
            <strong>{wpm || (started ? '0' : '0')}</strong>
          </div>
          <div>
            <span>ACCURACY</span>
            <strong>{accuracy}%</strong>
          </div>
          <div>
            <span>SCORE</span>
            <strong>{score.toLocaleString()}</strong>
          </div>
          <button className="restart-button" type="button" onClick={() => restartGame()}>
            Restart (Esc) ↻
          </button>
        </div>
      </div>

      <div className="typesprint-toolbar" aria-label="Sprint settings">
        <div className="toolbar-group">
          <span className="toolbar-label">THEME</span>
          <div className="toolbar-pills">
            {Object.entries(wordBanks).map(([key, bank]) => (
              <button
                key={key}
                type="button"
                className={`toolbar-pill ${category === key ? 'active' : ''}`}
                onClick={() => handleCategoryChange(key)}
              >
                {bank.label}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">DURATION</span>
          <div className="toolbar-pills">
            {timeModes.map((sec) => (
              <button
                key={sec}
                type="button"
                className={`toolbar-pill ${duration === sec ? 'active' : ''}`}
                onClick={() => handleDurationChange(sec)}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="typesprint-layout">
        <div className="word-display" onClick={() => inputRef.current?.focus()}>
          <div className="sprint-progress-track" aria-hidden="true">
            <div
              className={`sprint-progress-fill ${isLowTime ? 'danger' : ''}`}
              style={{ width: `${timePercent}%` }}
            />
          </div>

          <div className="word-display-header">
            <p className="eyebrow">ACTIVE WORD · {wordBanks[category].label.toUpperCase()}</p>
            <div className="combo-badges">
              <span className={`combo-pill ${streak >= 5 ? 'hot' : ''}`}>
                🔥 Streak: {streak}
              </span>
              <span className={`multiplier-pill ${multiplier > 1 ? 'boosted' : ''}`}>
                {multiplier}x PTS
              </span>
            </div>
          </div>

          {wordHistory.length > 0 && (
            <div className="completed-words-strip" aria-label="Recently typed words">
              {wordHistory.slice(-6).map((item, idx) => (
                <span
                  key={`${item.word}-${idx}`}
                  className={`completed-chip ${item.correct ? 'is-correct' : 'is-wrong'}`}
                >
                  {item.word} {item.correct ? '✓' : '✕'}
                </span>
              ))}
            </div>
          )}

          <div className="word-chars" aria-label={`Type: ${currentWord}`}>
            {renderActiveWord()}
          </div>

          <div className="upcoming-stream" aria-label="Upcoming words">
            <span className="stream-label">UP NEXT</span>
            <div className="upcoming-words-list">
              {targetWords.slice(currentWordIndex + 1, currentWordIndex + 8).map((word, idx) => (
                <span key={`${word}-${idx}`} className={`upcoming-word ${idx === 0 ? 'next' : ''}`}>
                  {word}
                </span>
              ))}
            </div>
          </div>

          {!finished && (
            <div className="type-input-row">
              <input
                ref={inputRef}
                type="text"
                className={`type-input ${
                  userInput.length > 0 && !currentWord.startsWith(userInput) ? 'has-error' : ''
                }`}
                value={userInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                aria-label="Type the current word here"
                placeholder={started ? 'Keep typing...' : 'Start typing to begin the countdown...'}
              />
              <span className="input-hint">Space / Enter to submit · Esc to reset</span>
            </div>
          )}

          {finished && (
            <div className="sprint-summary-card" role="status">
              <div className="summary-rank">
                <span className="summary-rank-icon">{rank.icon}</span>
                <div>
                  <span className="eyebrow">SPRINT COMPLETE · {duration}S MODE</span>
                  <h3>{rank.title}</h3>
                </div>
                <button type="button" className="primary-button" onClick={() => restartGame()}>
                  Sprint Again ↻
                </button>
              </div>

              <div className="summary-metrics-grid">
                <div className="summary-metric">
                  <span>NET WPM</span>
                  <strong>{wpm}</strong>
                </div>
                <div className="summary-metric">
                  <span>RAW WPM</span>
                  <strong>{rawWpm}</strong>
                </div>
                <div className="summary-metric">
                  <span>ACCURACY</span>
                  <strong>{accuracy}%</strong>
                </div>
                <div className="summary-metric">
                  <span>WORDS</span>
                  <strong>{wordsCompleted}/{wordsCompleted + wordMistakes}</strong>
                </div>
                <div className="summary-metric">
                  <span>BEST STREAK</span>
                  <strong>{bestStreak} 🔥</strong>
                </div>
                <div className="summary-metric">
                  <span>FINAL SCORE</span>
                  <strong>{score.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="typesprint-sidebar">
          <div className="stat-card">
            <span className="stat-label">BEST WPM</span>
            <strong>{highScores[0]?.wpm || '—'}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">BEST STREAK</span>
            <strong>{bestStreak || '0'} 🔥</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">RUNS COMPLETED</span>
            <strong>{highScores.length}</strong>
          </div>

          <div className="leaderboard-mini">
            <p className="eyebrow">PERSONAL TOP RUNS</p>
            <ol>
              {highScores.slice(0, 5).map((s, i) => (
                <li key={i}>
                  <span>#{i + 1}</span>
                  <span>{s.wpm} WPM</span>
                  <span>{s.accuracy}%</span>
                </li>
              ))}
              {highScores.length === 0 && <li className="empty">Complete a run to set a record</li>}
            </ol>
          </div>

          <div className="how-to-play">
            <p className="eyebrow">PRO TIPS</p>
            <ol>
              <li>Exact word matches auto-advance immediately.</li>
              <li>Chain 5, 10, or 20 flawless words for <strong>1.5x–3x</strong> points.</li>
              <li>Read the <strong>Up Next</strong> queue to keep your rhythm steady.</li>
              <li>Press <strong>Esc</strong> anytime for an instant restart.</li>
            </ol>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default TypeSprint
