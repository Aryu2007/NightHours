import React, { useState, useEffect, useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useGameStats } from '../hooks/useGameStats'

const risingGames = [
  { title: 'Quiz Rush', to: '/rising', icon: '⚡', end: true },
  { title: 'Quiz Battle', to: '/rising/battle', icon: '⚔️' },
]

const categories = {
  general: [
    { question: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 2 },
    { question: 'Which element has the chemical symbol Au?', options: ['Silver', 'Gold', 'Copper', 'Iron'], answer: 1 },
    { question: 'How many time zones does Russia span?', options: ['9', '11', '7', '5'], answer: 1 },
    { question: 'What is the largest desert in the world?', options: ['Sahara', 'Arabian', 'Antarctic', 'Gobi'], answer: 2 },
    { question: 'Which planet has the most moons?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], answer: 1 },
  ],
  science: [
    { question: 'What is the speed of light in vacuum?', options: ['299,792 km/s', '199,792 km/s', '399,792 km/s', '99,792 km/s'], answer: 0 },
    { question: 'Which gas makes up ~78% of Earth\'s atmosphere?', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon'], answer: 2 },
    { question: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], answer: 2 },
    { question: 'How many bones in an adult human body?', options: ['206', '208', '210', '212'], answer: 0 },
    { question: 'What force keeps planets in orbit?', options: ['Electromagnetic', 'Gravity', 'Strong nuclear', 'Weak nuclear'], answer: 1 },
  ],
  tech: [
    { question: 'What does CPU stand for?', options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Core Processing Unit'], answer: 1 },
    { question: 'Which company created JavaScript?', options: ['Microsoft', 'Netscape', 'Sun Microsystems', 'Oracle'], answer: 1 },
    { question: 'What does HTTP stand for?', options: ['HyperText Transfer Protocol', 'HighText Transfer Protocol', 'HyperTool Transfer Protocol', 'HomeText Transfer Protocol'], answer: 0 },
    { question: 'Which language is primarily used for iOS development?', options: ['Java', 'Kotlin', 'Swift', 'Dart'], answer: 2 },
    { question: 'What is 2^10?', options: ['512', '1024', '2048', '4096'], answer: 1 },
  ],
  gaming: [
    { question: 'Which game won Game of the Year 2023?', options: ['Baldur\'s Gate 3', 'Alan Wake 2', 'Zelda: TotK', 'Spider-Man 2'], answer: 0 },
    { question: 'What year was Minecraft released?', options: ['2009', '2011', '2012', '2013'], answer: 1 },
    { question: 'Which company makes the PlayStation?', options: ['Microsoft', 'Nintendo', 'Sony', 'Sega'], answer: 2 },
    { question: 'What is the best-selling game of all time?', options: ['Tetris', 'Minecraft', 'GTA V', 'Wii Sports'], answer: 1 },
    { question: 'Which genre is League of Legends?', options: ['FPS', 'MMO', 'MOBA', 'RTS'], answer: 2 },
  ],
}

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5)

function QuizBattle() {
  const { updateStats } = useGameStats('quiz')
  const [mode, setMode] = useState('solo')
  const [category, setCategory] = useState('general')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [score, setScore] = useState(0)
  const [player2Score, setPlayer2Score] = useState(0)
  const [finished, setFinished] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [started, setStarted] = useState(false)
  const [playerTurn, setPlayerTurn] = useState(1)
  const [showResult, setShowResult] = useState(false)

  const timerRef = useRef(null)
  const transitionTimerRef = useRef(null)
  const scoreRef = useRef(0)
  const player2ScoreRef = useRef(0)
  const bestStreakRef = useRef(0)
  const currentStreakRef = useRef(0)

  const question = questions[currentIndex]

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (started && !finished && !showResult && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current)
            handleTimeUp()
            return 0
          }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [started, finished, showResult, currentIndex])

  const loadQuestions = () => {
    const catQuestions = shuffle(categories[category]).slice(0, 10)
    setQuestions(catQuestions.map((q) => ({
      ...q,
      options: shuffle(q.options.map((text, i) => ({ text, correct: i === q.answer }))),
    })))
  }

  const startGame = () => {
    loadQuestions()
    setCurrentIndex(0)
    setScore(0)
    setPlayer2Score(0)
    scoreRef.current = 0
    player2ScoreRef.current = 0
    bestStreakRef.current = 0
    currentStreakRef.current = 0
    setFinished(false)
    setStarted(true)
    setTimeLeft(30)
    setPlayerTurn(1)
    setShowResult(false)
  }

  const saveScore = (finalScore) => {
    try {
      const key = mode === 'solo' ? 'night-hours-quizbattle-solo' : 'night-hours-quizbattle-versus'
      const scores = JSON.parse(localStorage.getItem(key) || '[]')
      scores.push({ score: finalScore, category, mode, date: new Date().toISOString() })
      scores.sort((a, b) => b.score - a.score)
      localStorage.setItem(key, JSON.stringify(scores.slice(0, 10)))
    } catch {
      // Ignore storage errors
    }
  }

  const endGame = () => {
    setFinished(true)
    const finalScore = mode === 'solo' ? scoreRef.current : Math.max(scoreRef.current, player2ScoreRef.current)
    saveScore(finalScore)
    updateStats(finalScore, bestStreakRef.current, finalScore)
  }

  const advanceOrEnd = () => {
    transitionTimerRef.current = window.setTimeout(() => {
      if (currentIndex === questions.length - 1) {
        endGame()
      } else {
        setCurrentIndex((i) => i + 1)
        setSelectedAnswer(null)
        setShowResult(false)
        setTimeLeft(30)
        if (mode === 'versus') setPlayerTurn((t) => (t === 1 ? 2 : 1))
      }
    }, 1500)
  }

  const chooseAnswer = (index) => {
    if (selectedAnswer !== null || showResult) return
    setSelectedAnswer(index)
    setShowResult(true)
    clearInterval(timerRef.current)

    const isCorrect = question.options[index].correct
    const timeBonus = Math.max(0, Math.floor(timeLeft / 3))
    const points = isCorrect ? 100 + timeBonus : 0

    if (isCorrect) {
      currentStreakRef.current += 1
      bestStreakRef.current = Math.max(bestStreakRef.current, currentStreakRef.current)
    } else {
      currentStreakRef.current = 0
    }

    if (mode === 'solo' || playerTurn === 1) {
      setScore((s) => {
        const next = s + points
        scoreRef.current = next
        return next
      })
    } else {
      setPlayer2Score((s) => {
        const next = s + points
        player2ScoreRef.current = next
        return next
      })
    }

    advanceOrEnd()
  }

  const handleTimeUp = () => {
    currentStreakRef.current = 0
    setShowResult(true)
    advanceOrEnd()
  }

  const restartGame = () => {
    clearInterval(timerRef.current)
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    setStarted(false)
    setFinished(false)
    setSelectedAnswer(null)
    setShowResult(false)
  }

  const highScores = (() => {
    try {
      return JSON.parse(localStorage.getItem(mode === 'solo' ? 'night-hours-quizbattle-solo' : 'night-hours-quizbattle-versus') || '[]')
    } catch {
      return []
    }
  })()

  if (!started) {
    return (
      <section className="quiz-page">
        <nav className="zone-subnav" aria-label="Rising Hours games">
          {risingGames.map((game) => (
            <NavLink key={game.to} to={game.to} end={game.end} className="zone-pill">
              <span>{game.icon}</span>
              <span>{game.title}</span>
            </NavLink>
          ))}
        </nav>

        <div className="quiz-header">
          <div>
            <p className="eyebrow">RISING HOURS · GAME 02</p>
            <h1>Quiz <span>Battle.</span></h1>
          </div>
        </div>
        <div className="battle-setup">
          <div className="setup-card">
            <p className="eyebrow">GAME MODE</p>
            <div className="mode-buttons">
              <button type="button" className={`mode-btn ${mode === 'solo' ? 'active' : ''}`} onClick={() => setMode('solo')}>
                <span>🏃</span> Solo Challenge
              </button>
              <button type="button" className={`mode-btn ${mode === 'versus' ? 'active' : ''}`} onClick={() => setMode('versus')}>
                <span>⚔️</span> Versus (2 Players)
              </button>
            </div>
          </div>
          <div className="setup-card">
            <p className="eyebrow">CATEGORY</p>
            <div className="category-grid">
              {Object.entries(categories).map(([key, qs]) => (
                <button type="button" key={key} className={`category-btn ${category === key ? 'active' : ''}`} onClick={() => setCategory(key)}>
                  <span className="cat-icon">{['🌍', '🔬', '💻', '🎮'][Object.keys(categories).indexOf(key)]}</span>
                  <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  <small>{qs.length} questions</small>
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="primary-button large" onClick={startGame}>Start Battle →</button>
        </div>
        <div className="leaderboard-section">
          <p className="eyebrow">TOP SCORES — {mode === 'solo' ? 'SOLO' : 'VERSUS'}</p>
          <ol className="leaderboard-list">
            {highScores.slice(0, 5).map((s, i) => (
              <li key={i}>
                <span>#{i + 1}</span>
                <span>{s.score} pts</span>
                <span className="cat-badge">{s.category}</span>
              </li>
            ))}
            {highScores.length === 0 && <li className="empty">No scores yet — be the first!</li>}
          </ol>
        </div>
      </section>
    )
  }

  if (finished) {
    const winner = mode === 'versus' && player2Score > score ? 'Player 2' : 'Player 1'
    const finalScore = mode === 'versus' ? Math.max(score, player2Score) : score
    return (
      <section className="quiz-page quiz-result">
        <p className="eyebrow">RISING HOURS · BATTLE COMPLETE</p>
        <span className="result-icon">⚔️</span>
        <h1>{mode === 'versus' ? `${winner} Wins!` : finalScore >= 400 ? 'Champion!' : finalScore >= 250 ? 'Strong Fighter!' : 'Keep Training!'}</h1>
        <div className="final-scores">
          <div className="final-score-card">
            <span>PLAYER 1</span>
            <strong>{score}</strong>
          </div>
          {mode === 'versus' && (
            <div className="final-score-card">
              <span>PLAYER 2</span>
              <strong>{player2Score}</strong>
            </div>
          )}
        </div>
        <p>Category: {category.charAt(0).toUpperCase() + category.slice(1)} · {questions.length} Questions</p>
        <div className="result-actions">
          <button type="button" className="primary-button" onClick={restartGame}>Rematch</button>
          <Link to="/rising" className="outline-button">Back to Quiz Rush</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="quiz-page">
      <div className="quiz-header battle-header">
        <div>
          <p className="eyebrow">RISING HOURS · GAME 02</p>
          <h1>Quiz <span>Battle.</span></h1>
        </div>
        <div className="battle-scores">
          <div className={`battle-score ${playerTurn === 1 && mode === 'versus' ? 'active' : ''}`}>
            <span>PLAYER 1</span>
            <strong>{score}</strong>
          </div>
          {mode === 'versus' && (
            <div className={`battle-score ${playerTurn === 2 ? 'active' : ''}`}>
              <span>PLAYER 2</span>
              <strong>{player2Score}</strong>
            </div>
          )}
        </div>
      </div>
      <div className="quiz-progress" aria-label={`Question ${currentIndex + 1} of ${questions.length}`}>
        <span style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></span>
      </div>
      <div className="quiz-meta battle-meta">
        <span>QUESTION {String(currentIndex + 1).padStart(2, '0')}</span>
        <span className="timer"><span className="timer-dot"></span>{timeLeft}s</span>
        <span>{questions.length} TOTAL</span>
      </div>
      <article className="question-card">
        <div className="question-category">{category.charAt(0).toUpperCase() + category.slice(1)}</div>
        <h2>{question.question}</h2>
        <div className="answer-list">
          {question.options.map((option, index) => {
            let answerState = ''
            if (showResult) {
              answerState = option.correct ? 'is-correct' : index === selectedAnswer ? 'is-wrong' : ''
            }
            return (
              <button
                className={`answer-button ${answerState}`}
                key={option.text}
                type="button"
                onClick={() => chooseAnswer(index)}
                disabled={showResult}
              >
                <span>{String.fromCharCode(65 + index)}</span>
                {option.text}
                {showResult && option.correct && <b>✓</b>}
              </button>
            )
          })}
        </div>
        {showResult && (
          <div className={`quiz-feedback ${selectedAnswer !== null && question.options[selectedAnswer].correct ? 'correct' : 'wrong'}`}>
            <span>
              {selectedAnswer !== null && question.options[selectedAnswer].correct
                ? 'Correct!'
                : `The answer was ${question.options.find((o) => o.correct).text}.`}
            </span>
          </div>
        )}
      </article>
    </section>
  )
}

export default QuizBattle
