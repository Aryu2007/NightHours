import React, { useState, useEffect, useRef } from 'react'
import { useGameStats } from '../hooks/useGameStats'

const tiles = ['🌿', '🌻', '🍀', '🌊', '🍂', '🌙', '🌸', '⭐', '🦋']

function randomSequence(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * tiles.length))
}

function PatternRecall() {
  const { updateStats } = useGameStats('pattern')
  const [sequence, setSequence] = useState(() => randomSequence(4))
  const [activeTile, setActiveTile] = useState(null)
  const [showing, setShowing] = useState(false)
  const [started, setStarted] = useState(false)
  const [playerSteps, setPlayerSteps] = useState([])
  const [message, setMessage] = useState('Press “Show pattern” and watch carefully.')
  const [score, setScore] = useState(0)
  const timeoutsRef = useRef([])

  const clearPatternTimeouts = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id))
    timeoutsRef.current = []
  }

  useEffect(() => {
    return () => clearPatternTimeouts()
  }, [])

  const showPattern = () => {
    if (showing) return
    clearPatternTimeouts()
    setStarted(true)
    setShowing(true)
    setPlayerSteps([])
    setMessage('Watch the glowing tiles…')

    sequence.forEach((tile, index) => {
      const t1 = window.setTimeout(() => setActiveTile(tile), index * 700 + 250)
      const t2 = window.setTimeout(() => setActiveTile(null), index * 700 + 650)
      timeoutsRef.current.push(t1, t2)
    })

    const finishId = window.setTimeout(() => {
      setShowing(false)
      setMessage('Now repeat the pattern by tapping the tiles.')
    }, sequence.length * 700 + 120)
    timeoutsRef.current.push(finishId)
  }

  const tapTile = (index) => {
    if (!started || showing || playerSteps.length === sequence.length) return
    const newSteps = [...playerSteps, index]
    setPlayerSteps(newSteps)
    const currentStep = newSteps.length - 1
    if (index !== sequence[currentStep]) {
      setMessage('Almost! Let’s try a new pattern.')
      setStarted(false)
      setPlayerSteps([])
      return
    }
    if (newSteps.length === sequence.length) {
      const nextScore = score + 1
      const points = sequence.length * 25
      setScore(nextScore)
      updateStats(points, nextScore, points)
      setMessage('Wonderful! You remembered every tile.')
      setStarted(false)
    } else {
      setMessage(`Great! ${sequence.length - newSteps.length} more to go.`)
    }
  }

  const newRound = () => {
    clearPatternTimeouts()
    setSequence(randomSequence(Math.min(7, 4 + score)))
    setActiveTile(null)
    setShowing(false)
    setStarted(false)
    setPlayerSteps([])
    setMessage('A new pattern is ready. Press “Show pattern”.')
  }

  return (
    <section className="golden-page">
      <div className="golden-header">
        <div>
          <p className="eyebrow">GOLDEN HOURS · GAME 01</p>
          <h1>Pattern <span>Recall.</span></h1>
          <p>A gentle game to exercise memory and concentration. Watch the pattern, then repeat it at your own pace.</p>
        </div>
        <div className="golden-score">
          <span>ROUNDS WON</span>
          <strong>{score}</strong>
        </div>
      </div>

      <div className="pattern-layout">
        <div className="pattern-game">
          <div className="pattern-top">
            <span>PATTERN LENGTH: {sequence.length}</span>
            <span>{showing ? 'WATCHING' : started ? 'YOUR TURN' : 'READY'}</span>
          </div>
          <div className="pattern-grid">
            {tiles.map((tile, index) => (
              <button
                key={tile}
                type="button"
                className={`pattern-tile ${activeTile === index ? 'glowing' : ''}`}
                onClick={() => tapTile(index)}
                aria-label={`Pattern tile ${index + 1}`}
              >
                {tile}
              </button>
            ))}
          </div>
          <p className="pattern-message" role="status">{message}</p>
          <div className="pattern-actions">
            <button className="show-pattern" type="button" onClick={showPattern}>
              {showing ? 'Showing pattern…' : 'Show pattern'}
            </button>
            <button className="new-round" type="button" onClick={newRound}>
              New pattern ↻
            </button>
          </div>
        </div>

        <aside className="golden-guide">
          <p className="eyebrow">A CALM MOMENT</p>
          <h2>How it works</h2>
          <ol>
            <li>Press <strong>Show pattern</strong>.</li>
            <li>Watch each glowing tile.</li>
            <li>Tap the same tiles in order.</li>
          </ol>
          <p>There is no timer. Take as much time as you need.</p>
        </aside>
      </div>
    </section>
  )
}

export default PatternRecall
