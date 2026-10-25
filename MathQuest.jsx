import React, { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useGameStats } from '../hooks/useGameStats'

const learningGames = [
  { title: 'Memory Match', to: '/learning', icon: '🧠', end: true },
  { title: 'Type Sprint', to: '/learning/typesprint', icon: '⌨️' },
  { title: 'Math Quest', to: '/learning/mathquest', icon: '🧮' },
]

const difficultyConfig = {
  1: { label: '🌱 Cadet', ops: ['+', '-'], basePoints: 10 },
  2: { label: '⚡ Navigator', ops: ['+', '-', '×'], basePoints: 20 },
  3: { label: '🔥 Commander', ops: ['+', '-', '×', '÷'], basePoints: 30 },
  4: { label: '🌌 Grandmaster', ops: ['+', '-', '×', '÷', '²'], basePoints: 45 },
}

const gameModes = [
  { key: 'blitz', label: '⚡ 60s Blitz', duration: 60 },
  { key: 'marathon', label: '🛡️ 120s Marathon', duration: 120 },
  { key: 'survival', label: '❤️ 3-Life Survival', duration: 90 },
]

function generateOptions(correctAnswer) {
  const choices = new Set([correctAnswer])
  const offsets = [-10, -3, -2, -1, 1, 2, 3, 5, 10, 12]
  while (choices.size < 4) {
    const delta = offsets[Math.floor(Math.random() * offsets.length)]
    const candidate = Math.max(0, correctAnswer + delta)
    if (candidate !== correctAnswer) {
      choices.add(candidate)
    } else {
      choices.add(correctAnswer + choices.size + 1)
    }
  }
  return [...choices].sort(() => Math.random() - 0.5)
}

function generateProblem(difficulty) {
  const config = difficultyConfig[difficulty] || difficultyConfig[1]
  const op = config.ops[Math.floor(Math.random() * config.ops.length)]
  let a, b, answer, text

  switch (op) {
    case '+': {
      const max = difficulty === 1 ? 15 : difficulty === 2 ? 35 : difficulty === 3 ? 65 : 120
      a = Math.floor(Math.random() * max) + 2
      b = Math.floor(Math.random() * max) + 2
      answer = a + b
      text = `${a} + ${b}`
      break
    }
    case '-': {
      const max = difficulty === 1 ? 18 : difficulty === 2 ? 40 : difficulty === 3 ? 75 : 140
      a = Math.floor(Math.random() * max) + 5
      b = Math.floor(Math.random() * max) + 2
      if (a < b) [a, b] = [b, a]
      answer = a - b
      text = `${a} − ${b}`
      break
    }
    case '×': {
      const maxA = difficulty <= 2 ? 9 : difficulty === 3 ? 12 : 16
      const maxB = difficulty <= 2 ? 9 : 12
      a = Math.floor(Math.random() * maxA) + 2
      b = Math.floor(Math.random() * maxB) + 2
      answer = a * b
      text = `${a} × ${b}`
      break
    }
    case '÷': {
      const maxDivisor = difficulty === 3 ? 10 : 14
      b = Math.floor(Math.random() * (maxDivisor - 1)) + 2
      answer = Math.floor(Math.random() * 11) + 2
      a = b * answer
      text = `${a} ÷ ${b}`
      break
    }
    case '²': {
      a = Math.floor(Math.random() * 14) + 3
      b = 2
      answer = a * a
      text = `${a}²`
      break
    }
    default: {
      a = 5
      b = 5
      answer = 10
      text = '5 + 5'
    }
  }

  return {
    a,
    b,
    op,
    answer,
    text,
    options: generateOptions(answer)
  }
}

function getMathRank(score) {
  if (score >= 600) return { icon: '🌌', title: 'Quantum Savant' }
  if (score >= 350) return { icon: '🚀', title: 'Astro Mathematician' }
  if (score >= 180) return { icon: '⚡', title: 'Neural Calculator' }
  return { icon: '🌙', title: 'Number Cadet' }
}

function MathQuest() {
  const { updateStats } = useGameStats('math')
  const [difficulty, setDifficulty] = useState(1)
  const [mode, setMode] = useState('blitz')
  const [autoSubmit, setAutoSubmit] = useState(true)
  const [problems, setProblems] = useState(() => Array.from({ length: 16 }, () => generateProblem(1)))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [solvedCount, setSolvedCount] = useState(0)
  const [AttemptCount, setAttemptCount] = useState(0)
  const [history, setHistory] = useState([])
  const [feedbackBanner, setFeedbackBanner] = useState(null)
  const [finished, setFinished] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [started, setStarted] = useState(false)
  const [highScores, setHighScores] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('night-hours-mathquest') || '[]')
    } catch {
      return []
    }
  })

  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const problemShownAtRef = useRef(Date.now())
  const scoreRef = useRef(0)
  const bestStreakRef = useRef(0)
  const gameEndedRef = useRef(false)

  const currentModeObj = gameModes.find((m) => m.key === mode) || gameModes[0]
  const currentProblem = problems[currentIndex] || generateProblem(difficulty)
  const multiplier = streak >= 15 ? 3 : streak >= 10 ? 2 : streak >= 5 ? 1.5 : 1

  const saveScore = (finalScore, finalBestStreak) => {
    try {
      const scores = JSON.parse(localStorage.getItem('night-hours-mathquest') || '[]')
      scores.push({
        score: finalScore,
        streak: finalBestStreak,
        difficulty,
        mode,
        date: new Date().toISOString()
      })
      scores.sort((a, b) => b.score - a.score)
      const topScores = scores.slice(0, 10)
      localStorage.setItem('night-hours-mathquest', JSON.stringify(topScores))
      setHighScores(topScores)
    } catch {
      // Ignore storage errors
    }
  }

  const endGame = () => {
    if (gameEndedRef.current) return
    gameEndedRef.current = true
    clearInterval(timerRef.current)
    setFinished(true)
    saveScore(scoreRef.current, bestStreakRef.current)
    updateStats(scoreRef.current, bestStreakRef.current, scoreRef.current)
  }

  useEffect(() => {
    if (!started || finished) return undefined

    timerRef.current = window.setInterval(() => {
      setTimeLeft((time) => {
        if (time <= 1) {
          clearInterval(timerRef.current)
          endGame()
          return 0
        }
        return time - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [started, finished])

  const submitNumericAnswer = (numericAnswer) => {
    if (finished || Number.isNaN(numericAnswer)) return

    if (!started) {
      setStarted(true)
      startTimeRef.current = Date.now()
    }

    const solveMs = Date.now() - (problemShownAtRef.current || Date.now())
    const isFast = solveMs <= 3000
    const isCorrect = numericAnswer === currentProblem.answer

    setAttemptCount((c) => c + 1)

    if (isCorrect) {
      setSolvedCount((c) => c + 1)
      const nextStreak = streak + 1
      const nextMult = nextStreak >= 15 ? 3 : nextStreak >= 10 ? 2 : nextStreak >= 5 ? 1.5 : 1
      const basePts = difficultyConfig[difficulty]?.basePoints || 10
      const speedBonus = isFast ? 5 : 0
      const points = Math.round((basePts + speedBonus) * nextMult)

      setScore((currentScore) => {
        const nextScore = currentScore + points
        scoreRef.current = nextScore
        return nextScore
      })

      setStreak(nextStreak)
      setBestStreak((b) => {
        const nextBest = Math.max(b, nextStreak)
        bestStreakRef.current = nextBest
        return nextBest
      })

      // Award +2s time bonus every 5 streak in blitz/survival
      if (nextStreak % 5 === 0) {
        setTimeLeft((t) => Math.min(currentModeObj.duration + 15, t + 2))
        setFeedbackBanner({ text: `🔥 ${nextStreak} Streak! +${points} pts · +2s Bonus`, type: 'bonus' })
      } else {
        setFeedbackBanner({
          text: `${isFast ? '⚡ Fast Solve! ' : '✓ Correct! '}+${points} pts`,
          type: 'correct'
        })
      }
    } else {
      setStreak(0)
      setFeedbackBanner({
        text: `✕ ${currentProblem.text} = ${currentProblem.answer}`,
        type: 'wrong'
      })
      if (mode === 'survival') {
        setLives((prevLives) => {
          const remaining = prevLives - 1
          if (remaining <= 0) {
            window.setTimeout(() => endGame(), 120)
          }
          return remaining
        })
      }
    }

    setHistory((prev) => [
      ...prev.slice(-7),
      {
        text: currentProblem.text,
        userAnswer: numericAnswer,
        answer: currentProblem.answer,
        correct: isCorrect
      }
    ])

    setUserAnswer('')
    problemShownAtRef.current = Date.now()

    if (currentIndex >= problems.length - 6) {
      setProblems((prev) => [...prev, ...Array.from({ length: 12 }, () => generateProblem(difficulty))])
    }
    setCurrentIndex((i) => i + 1)
    inputRef.current?.focus()
  }

  const handleSubmit = () => {
    if (userAnswer.trim() === '') return
    submitNumericAnswer(parseInt(userAnswer, 10))
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setUserAnswer(val)
    if (!started && val.length > 0) {
      setStarted(true)
      startTimeRef.current = Date.now()
      problemShownAtRef.current = Date.now()
    }
    // Auto-submit when exact correct answer is typed
    if (autoSubmit && val.trim() !== '') {
      const parsed = parseInt(val, 10)
      if (!Number.isNaN(parsed) && parsed === currentProblem.answer && String(parsed) === String(currentProblem.answer)) {
        submitNumericAnswer(parsed)
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      restartGame(difficulty, mode)
    }
  }

  const restartGame = (targetDifficulty = difficulty, targetMode = mode) => {
    clearInterval(timerRef.current)
    const targetModeObj = gameModes.find((m) => m.key === targetMode) || gameModes[0]
    setProblems(Array.from({ length: 16 }, () => generateProblem(targetDifficulty)))
    setCurrentIndex(0)
    setUserAnswer('')
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setLives(3)
    setSolvedCount(0)
    setAttemptCount(0)
    setHistory([])
    setFeedbackBanner(null)
    setFinished(false)
    setTimeLeft(targetModeObj.duration)
    setStarted(false)
    scoreRef.current = 0
    bestStreakRef.current = 0
    gameEndedRef.current = false
    problemShownAtRef.current = Date.now()
    window.setTimeout(() => inputRef.current?.focus(), 20)
  }

  const changeDifficulty = (newDifficulty) => {
    setDifficulty(newDifficulty)
    restartGame(newDifficulty, mode)
  }

  const changeMode = (newMode) => {
    setMode(newMode)
    restartGame(difficulty, newMode)
  }

  const timePercent = Math.max(0, Math.min(100, (timeLeft / currentModeObj.duration) * 100))
  const isLowTime = started && !finished && timeLeft <= 10
  const accuracy = AttemptCount > 0 ? Math.round((solvedCount / AttemptCount) * 100) : 100
  const elapsedSeconds = startTimeRef.current
    ? Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
    : currentModeObj.duration - timeLeft
  const avgSpeed = solvedCount > 0 ? (Math.max(1, elapsedSeconds) / solvedCount).toFixed(1) : '—'
  const rank = getMathRank(score)

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
          <p className="eyebrow">LEARNING HOURS · GAME 03</p>
          <h1>Math <span>Quest.</span></h1>
          <p>Solve rapid-fire equations with instant auto-submit, combo multipliers, and +2s streak time bonuses.</p>
        </div>
        <div className="game-stats typesprint-top-stats" aria-label="Game stats">
          <div>
            <span>TIME</span>
            <strong className={isLowTime ? 'low-time' : ''}>{timeLeft}s</strong>
          </div>
          <div>
            <span>SCORE</span>
            <strong>{score.toLocaleString()}</strong>
          </div>
          <div>
            <span>ACCURACY</span>
            <strong>{accuracy}%</strong>
          </div>
          <div>
            <span>{mode === 'survival' ? 'LIVES' : 'BEST STREAK'}</span>
            <strong>{mode === 'survival' ? '❤️'.repeat(Math.max(0, lives)) || '0' : `${bestStreak} 🔥`}</strong>
          </div>
          <button className="restart-button" type="button" onClick={() => restartGame()}>
            Restart (Esc) ↻
          </button>
        </div>
      </div>

      <div className="typesprint-toolbar" aria-label="Math Quest settings">
        <div className="toolbar-group">
          <span className="toolbar-label">TIER</span>
          <div className="toolbar-pills">
            {Object.entries(difficultyConfig).map(([lvl, cfg]) => (
              <button
                key={lvl}
                type="button"
                className={`toolbar-pill ${difficulty === Number(lvl) ? 'active' : ''}`}
                onClick={() => changeDifficulty(Number(lvl))}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">MODE</span>
          <div className="toolbar-pills">
            {gameModes.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`toolbar-pill ${mode === m.key ? 'active' : ''}`}
                onClick={() => changeMode(m.key)}
              >
                {m.label}
              </button>
            ))}
            <button
              type="button"
              className={`toolbar-pill ${autoSubmit ? 'active' : ''}`}
              onClick={() => setAutoSubmit((v) => !v)}
              title="Automatically submit as soon as you type the correct answer"
            >
              ⚡ Auto-Submit: {autoSubmit ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      <div className="mathquest-layout">
        <div className="problem-display">
          <div className="problem-card">
            <div className="sprint-progress-track" aria-hidden="true">
              <div
                className={`sprint-progress-fill ${isLowTime ? 'danger' : ''}`}
                style={{ width: `${timePercent}%` }}
              />
            </div>

            <div className="word-display-header">
              <p className="eyebrow">
                PROBLEM #{solvedCount + 1} · {difficultyConfig[difficulty].label.toUpperCase()}
              </p>
              <div className="combo-badges">
                <span className={`combo-pill ${streak >= 5 ? 'hot' : ''}`}>
                  🔥 Streak: {streak}
                </span>
                <span className={`multiplier-pill ${multiplier > 1 ? 'boosted' : ''}`}>
                  {multiplier}x PTS
                </span>
              </div>
            </div>

            {history.length > 0 && (
              <div className="completed-words-strip math-history-strip" aria-label="Recent equations">
                {history.slice(-5).map((item, idx) => (
                  <span
                    key={`${item.text}-${idx}`}
                    className={`completed-chip ${item.correct ? 'is-correct' : 'is-wrong'}`}
                  >
                    {item.text} = {item.correct ? item.answer : `${item.userAnswer} (${item.answer})`}{' '}
                    {item.correct ? '✓' : '✕'}
                  </span>
                ))}
              </div>
            )}

            {!finished ? (
              <>
                <div className="problem-expression">{currentProblem.text} = ?</div>

                <div className="math-input-group">
                  <input
                    ref={inputRef}
                    type="number"
                    className="answer-input"
                    value={userAnswer}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    placeholder="?"
                    aria-label="Your answer"
                  />
                  <button
                    className="submit-btn"
                    type="button"
                    onClick={handleSubmit}
                    disabled={userAnswer.trim() === ''}
                  >
                    Submit →
                  </button>
                </div>

                <div className="math-quick-choices" aria-label="Quick answer choices">
                  <span className="quick-choice-label">OR QUICK PICK:</span>
                  <div className="quick-choice-grid">
                    {currentProblem.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className="quick-choice-btn"
                        onClick={() => submitNumericAnswer(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {feedbackBanner && (
                  <div className={`math-feedback-pill ${feedbackBanner.type}`} role="status">
                    {feedbackBanner.text}
                  </div>
                )}
              </>
            ) : (
              <div className="sprint-summary-card math-summary-card" role="status">
                <div className="summary-rank">
                  <span className="summary-rank-icon">{rank.icon}</span>
                  <div>
                    <span className="eyebrow">QUEST COMPLETE · {currentModeObj.label.toUpperCase()}</span>
                    <h3>{rank.title}</h3>
                  </div>
                  <button type="button" className="primary-button" onClick={() => restartGame()}>
                    Play Again ↻
                  </button>
                </div>

                <div className="summary-metrics-grid">
                  <div className="summary-metric">
                    <span>FINAL SCORE</span>
                    <strong>{score.toLocaleString()}</strong>
                  </div>
                  <div className="summary-metric">
                    <span>SOLVED</span>
                    <strong>{solvedCount}/{AttemptCount}</strong>
                  </div>
                  <div className="summary-metric">
                    <span>ACCURACY</span>
                    <strong>{accuracy}%</strong>
                  </div>
                  <div className="summary-metric">
                    <span>AVG SPEED</span>
                    <strong>{avgSpeed}s</strong>
                  </div>
                  <div className="summary-metric">
                    <span>BEST STREAK</span>
                    <strong>{bestStreak} 🔥</strong>
                  </div>
                  <div className="summary-metric">
                    <span>TIER</span>
                    <strong>{difficultyConfig[difficulty].label}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="next-preview">
            <p className="eyebrow">UPCOMING QUEUE</p>
            <div className="upcoming-math-row">
              {problems.slice(currentIndex + 1, currentIndex + 5).map((p, i) => (
                <div key={i} className="preview-problem-chip">{p.text}</div>
              ))}
            </div>
          </div>
        </div>

        <aside className="mathquest-sidebar">
          <div className="stat-card">
            <span className="stat-label">HIGH SCORE</span>
            <strong>{highScores[0]?.score?.toLocaleString() || '—'}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">RECORD STREAK</span>
            <strong>{highScores[0]?.streak || '—'} 🔥</strong>
          </div>

          <div className="leaderboard-mini">
            <p className="eyebrow">TOP RUNS</p>
            <ol>
              {highScores.slice(0, 5).map((s, i) => (
                <li key={i}>
                  <span>#{i + 1}</span>
                  <span>{s.score} pts</span>
                  <span>Lv.{s.difficulty || 1}</span>
                </li>
              ))}
              {highScores.length === 0 && <li className="empty">No scores yet</li>}
            </ol>
          </div>

          <div className="how-to-play">
            <p className="eyebrow">QUEST MECHANICS</p>
            <ol>
              <li>With <strong>Auto-Submit ON</strong>, typing the right number advances immediately.</li>
              <li>Solve in under <strong>3 seconds</strong> for a <strong>+5 Fast Solve</strong> bonus.</li>
              <li>Every <strong>5 streak</strong> grants <strong>+2 seconds</strong> and boosts your multiplier up to <strong>3x</strong>.</li>
            </ol>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default MathQuest
