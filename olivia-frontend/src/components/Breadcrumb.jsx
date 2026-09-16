import { Link } from 'react-router-dom'

export default function Breadcrumb({ parent, parentTo, current }) {
  return (
    <nav className="breadcrumb-bar" aria-label="Percorso">
      <Link to={parentTo} className="breadcrumb-bar__back">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {parent}
      </Link>
      <span className="breadcrumb-bar__sep">/</span>
      <span className="breadcrumb-bar__current">{current}</span>
    </nav>
  )
}
