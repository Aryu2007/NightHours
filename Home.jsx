import React from 'react'
import { Link } from 'react-router-dom'

const zones = [
  { icon: '✦', title: 'Learning Hours', text: 'Playful games that help young minds learn.', to: '/learning' },
  { icon: '⚡', title: 'Rising Hours', text: 'Challenges, strategy, and friendly competition.', to: '/rising' },
  { icon: '◉', title: 'Night Arena', text: 'A cloud-gaming experience for competitive players.', to: '/arena' },
  { icon: '◌', title: 'Golden Hours', text: 'Relaxing puzzles and memory training for every age.', to: '/golden' },
]

const featuredGames = [
  { title: 'Memory Match', category: 'Learning', icon: '🧠', tone: 'violet', to: '/learning' },
  { title: 'Type Sprint', category: 'Learning', icon: '⌨️', tone: 'blue', to: '/learning/typesprint' },
  { title: 'Math Quest', category: 'Learning', icon: '🧮', tone: 'pink', to: '/learning/mathquest' },
  { title: 'Quiz Rush', category: 'Rising', icon: '⚡', tone: 'blue', to: '/rising' },
  { title: 'Quiz Battle', category: 'Rising', icon: '⚔️', tone: 'pink', to: '/rising/battle' },
  { title: 'Pattern Recall', category: 'Golden', icon: '◫', tone: 'pink', to: '/golden' },
]

function Home() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">A GAMING WORLD FOR EVERY GENERATION</p>
        <h1>When the world rests,<br /><span>the game begins.</span></h1>
        <p className="hero-copy">Night Hours brings learning, fun, brain training, and competitive play together in one bold digital universe.</p>
        <div className="hero-actions">
          <Link className="primary-button" to="/arena">Explore Night Arena</Link>
          <a className="text-link" href="#zones">Choose your zone ↓</a>
        </div>
        <div className="hero-orb" aria-hidden="true">☾</div>
      </section>

      <section className="zones" id="zones">
        <div className="section-heading">
          <p className="eyebrow">CHOOSE YOUR PLAYTIME</p>
          <h2>Every player has their hour.</h2>
        </div>
        <div className="zone-grid">
          {zones.map((zone) => (
            <Link className="zone-card" key={zone.title} to={zone.to}>
              <span className="zone-icon">{zone.icon}</span>
              <h3>{zone.title}</h3>
              <p>{zone.text}</p>
              <span className="card-link">Enter zone →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="featured-section">
        <div className="section-heading section-heading-row">
          <div>
            <p className="eyebrow">PLAY SOMETHING NEW</p>
            <h2>Featured for tonight.</h2>
          </div>
          <Link className="text-link" to="/rising">View all games →</Link>
        </div>
        <div className="game-grid">
          {featuredGames.map((game) => (
            <Link className={`game-card ${game.tone}`} key={game.title} to={game.to}>
              <div className="game-card-top">
                <span>{game.category}</span>
                <span className="game-icon">{game.icon}</span>
              </div>
              <div>
                <h3>{game.title}</h3>
                <p>Quick to learn. Fun to master.</p>
                <span className="play-button">Play now <span>→</span></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="arena-preview">
        <div className="arena-copy">
          <p className="eyebrow">NIGHT ARENA · CLOUD PLAY PROTOTYPE</p>
          <h2>Your arena<br /><span>is always ready.</span></h2>
          <p>Choose a game, connect to a high-performance virtual setup, and enter the session from one dashboard.</p>
          <Link className="primary-button" to="/arena">Enter Night Arena</Link>
        </div>
        <div className="arena-console" aria-label="Night Arena virtual machine status">
          <div className="console-top"><span className="status-dot"></span> SESSION READY <span>•••</span></div>
          <div className="console-screen">
            <span className="screen-label">SELECTED GAME</span>
            <h3>Valorant</h3>
            <p>Competitive queue · Mumbai server</p>
          </div>
          <div className="console-specs">
            <div><span>GPU</span><strong>RTX 4090</strong></div>
            <div><span>MEMORY</span><strong>64 GB</strong></div>
            <div><span>LATENCY</span><strong>12 ms</strong></div>
          </div>
        </div>
      </section>

      <section className="stat-strip" aria-label="Night Hours community statistics">
        <div><strong>4</strong><span>play zones</span></div>
        <div><strong>24/7</strong><span>ready to play</span></div>
        <div><strong>∞</strong><span>hours of fun</span></div>
      </section>
    </>
  )
}

export default Home
