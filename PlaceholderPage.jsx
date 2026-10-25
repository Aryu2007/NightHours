import React from 'react'
import { Link } from 'react-router-dom'

function PlaceholderPage({ title }) {
  return (
    <section className="placeholder-page">
      <p className="eyebrow">COMING IN THE NEXT PHASE</p>
      <h1>{title}</h1>
      <p>This zone has its route and page ready. We will build its games and features step by step.</p>
      <Link className="primary-button" to="/">Back home</Link>
    </section>
  )
}

export default PlaceholderPage
