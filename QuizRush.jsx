import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useGameStats } from '../hooks/useGameStats'

const risingGames = [
  { title: 'Quiz Rush', to: '/rising', icon: '⚡', end: true },
  { title: 'Quiz Battle', to: '/rising/battle', icon: '⚔️' },
]

const questionBank = [
  { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], answer: 1 },
  { question: 'What does HTML stand for?', options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyper Tool Multi Language', 'Home Text Markup Link'], answer: 0 },
  { question: 'Which data structure uses the First In, First Out rule?', options: ['Stack', 'Tree', 'Queue', 'Graph'], answer: 2 },
  { question: 'How many bits are in one byte?', options: ['4', '8', '16', '32'], answer: 1 },
  { question: 'Which symbol is used for JavaScript comments?', options: ['<!-- -->', '//', '**', '##'], answer: 1 },
  { question: 'What is the capital city of Japan?', options: ['Seoul', 'Tokyo', 'Kyoto', 'Osaka'], answer: 1 },
  { question: 'Which CSS property changes the colour of text?', options: ['font-style', 'text-color', 'color', 'background'], answer: 2 },
  { question: 'What is 9 × 7?', options: ['56', '63', '72', '81'], answer: 1 },
  { question: 'Which of these is a web browser?', options: ['Node.js', 'React', 'Firefox', 'Python'], answer: 2 },
  { question: 'Which ocean is the largest on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
]

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5)

function createQuiz() {
  return shuffle(questionBank).slice(0, 5).map((question) => ({
    ...question,
    options: shuffle(question.options.map((text, index) => ({ text, correct: index === question.answer }))),
  }))
}

function QuizRush() {
  const { updateStats } = useGameStats('quiz')
  const [questions, setQuestions] = useState(createQuiz)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [finished, setFinished] = useState(false)

  const question = questions[currentQuestion]
  const isCorrect = selectedAnswer !== null && question?.options[selectedAnswer].correct

  const chooseAnswer = (index) => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(index)
    if (question.options[index].correct) {
      setScore((currentScore) => currentScore + 1)
      setStreak((currentStreak) => {
        const nextStreak = currentStreak + 1
        setBestStreak((best) => Math.max(best, nextStreak))
        return nextStreak
      })
    } else {
      setStreak(0)
    }
  }

  const nextQuestion = () => {
    if (currentQuestion === questions.length - 1) {
      setFinished(true)
      const points = score * 20
      updateStats(points, bestStreak, points)
      return
    }
    setCurrentQuestion((current) => current + 1)
    setSelectedAnswer(null)
  }

  const restartQuiz = () => {
    setQuestions(createQuiz())
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setFinished(false)
  }

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <section className="quiz-page quiz-result">
        <p className="eyebrow">RISING HOURS · QUIZ COMPLETE</p>
        <span className="result-icon">⚡</span>
        <h1>{percentage >= 80 ? 'Outstanding!' : percentage >= 50 ? 'Good effort!' : 'Keep rising!'}</h1>
        <p>You scored <strong>{score} out of {questions.length}</strong> ({score * 20} pts · Best streak: {bestStreak}). Every answer is another level of learning.</p>
        <div className="result-actions">
          <button className="primary-button" type="button" onClick={restartQuiz}>Play Quiz Rush again</button>
          <Link to="/rising/battle" className="outline-button">Try Quiz Battle ⚔️</Link>
        </div>
      </section>
    )
  }

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
          <p className="eyebrow">RISING HOURS · GAME 01</p>
          <h1>Quiz <span>Rush.</span></h1>
        </div>
        <div className="quiz-score">
          <span>SCORE</span>
          <strong>{score}</strong>
          <small>/ {questions.length}</small>
        </div>
      </div>

      <div className="quiz-progress" aria-label={`Question ${currentQuestion + 1} of ${questions.length}`}>
        <span style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}></span>
      </div>
      <div className="quiz-meta">
        <span>QUESTION {String(currentQuestion + 1).padStart(2, '0')}</span>
        <span>{questions.length} TOTAL</span>
      </div>

      <article className="question-card">
        <h2>{question.question}</h2>
        <div className="answer-list">
          {question.options.map((option, index) => {
            const answerState = selectedAnswer === null ? '' : option.correct ? 'is-correct' : index === selectedAnswer ? 'is-wrong' : ''
            return (
              <button
                className={`answer-button ${answerState}`}
                key={option.text}
                type="button"
                onClick={() => chooseAnswer(index)}
              >
                <span>{String.fromCharCode(65 + index)}</span>
                {option.text}
                {selectedAnswer !== null && option.correct && <b>✓</b>}
              </button>
            )
          })}
        </div>
        {selectedAnswer !== null && (
          <div className={`quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
            <span>{isCorrect ? 'Correct answer!' : `Not quite — the correct answer is ${question.options.find((option) => option.correct).text}.`}</span>
            <button type="button" onClick={nextQuestion}>
              {currentQuestion === questions.length - 1 ? 'See results →' : 'Next question →'}
            </button>
          </div>
        )}
      </article>
    </section>
  )
}

export default QuizRush
