import { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useGameStats } from '../hooks/useGameStats';

const symbols = ['🌙', '🎮', '⭐', '🚀', '🧩', '⚡'];

const learningGames = [
  { title: 'Memory Match', to: '/learning', icon: '🧠', end: true },
  { title: 'Type Sprint', to: '/learning/typesprint', icon: '⌨️' },
  { title: 'Math Quest', to: '/learning/mathquest', icon: '🧮' },
];

function createDeck() {
  return [...symbols, ...symbols]
    .map((symbol, index) => ({ id: `${symbol}-${index}`, symbol, revealed: false }))
    .sort(() => Math.random() - 0.5);
}

function MemoryMatch() {
  const { updateStats } = useGameStats('memory');
  const [cards, setCards] = useState(createDeck);
  const [firstCard, setFirstCard] = useState(null);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [locked, setLocked] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [winData, setWinData] = useState(null);
  const flipTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    };
  }, []);

  const restartGame = () => {
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    setCards(createDeck());
    setFirstCard(null);
    setMoves(0);
    setMatches(0);
    setLocked(false);
    setHasWon(false);
    setWinData(null);
  };

  const revealCard = (selectedCard) => {
    if (locked || selectedCard.revealed || selectedCard.id === firstCard?.id) return;
    setCards((currentCards) => currentCards.map((card) => (
      card.id === selectedCard.id ? { ...card, revealed: true } : card
    )));

    if (!firstCard) {
      setFirstCard(selectedCard);
      return;
    }

    setMoves((currentMoves) => currentMoves + 1);
    setLocked(true);
    const isMatch = selectedCard.symbol === firstCard.symbol;

    flipTimerRef.current = window.setTimeout(() => {
      if (isMatch) {
        setMatches((currentMatches) => currentMatches + 1);
      } else {
        setCards((currentCards) => currentCards.map((card) => (
          card.id === selectedCard.id || card.id === firstCard.id
            ? { ...card, revealed: false }
            : card
        )));
      }
      setFirstCard(null);
      setLocked(false);
    }, isMatch ? 450 : 850);
  };

  useEffect(() => {
    if (matches === symbols.length && !hasWon) {
      const streak = Math.max(1, 13 - moves);
      const score = streak * 50;
      setHasWon(true);
      setWinData({ score, streak });
      updateStats(score, streak, score);
    }
  }, [matches, hasWon, moves, updateStats]);

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
          <p className="eyebrow">LEARNING HOURS · GAME 01</p>
          <h1>Memory <span>Match.</span></h1>
          <p>Flip two cards at a time and find all the matching symbols. Take your time, remember the positions, and have fun.</p>
        </div>
        <div className="game-stats" aria-label="Game score">
          <div><span>MOVES</span><strong>{moves}</strong></div>
          <div><span>PAIRS</span><strong>{matches}/{symbols.length}</strong></div>
          <button className="restart-button" type="button" onClick={restartGame}>Restart ↻</button>
        </div>
      </div>

      <div className="memory-layout">
        <div className="memory-board" aria-label="Memory Match board">
          {cards.map((card) => (
            <button
              className={`memory-card ${card.revealed ? 'is-revealed' : ''}`}
              key={card.id}
              type="button"
              onClick={() => revealCard(card)}
              aria-label={card.revealed ? `Revealed ${card.symbol}` : 'Hidden card'}
            >
              <span className="card-face card-back">✦</span>
              <span className="card-face card-front">{card.symbol}</span>
            </button>
          ))}
        </div>
        <aside className="how-to-play">
          <p className="eyebrow">HOW TO PLAY</p>
          <ol>
            <li>Choose any card to reveal it.</li>
            <li>Choose a second card to make a pair.</li>
            <li>Match all six pairs to win.</li>
          </ol>
          <p className="tip">Tip: Try to finish with as few moves as possible.</p>
          <div className="other-games">
            <p className="eyebrow">MORE LEARNING GAMES</p>
            <div className="game-links">
              {learningGames.filter((g) => g.to !== '/learning').map((game) => (
                <Link key={game.title} to={game.to} className="game-link">
                  <span>{game.icon}</span>
                  {game.title}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {hasWon && (
        <div className="win-message" role="status">
          <span>✦</span>
          <div>
            <strong>You matched every pair!</strong>
            <p>Excellent memory — you finished in {moves} moves. +{winData?.score} pts · Streak: {winData?.streak}</p>
          </div>
          <button type="button" onClick={restartGame}>Play again</button>
        </div>
      )}
    </section>
  );
}

export default MemoryMatch;
