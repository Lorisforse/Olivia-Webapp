import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import OliviaLogo from './OliviaLogo'
import { useAuth } from '../context/AuthContext'

// Titoli da ignorare nel calcolo delle iniziali: "Dr.ssa Elena Russo" -> "ER"
const HONORIFICS = /^(dr|dr\.ssa|dott|dott\.ssa|prof|prof\.ssa|sig|sig\.ra)\.?$/i

function initials(name) {
  const parts = String(name || '').split(/\s+/).filter(p => p && !HONORIFICS.test(p))
  if (!parts.length) return String(name || '?').slice(0, 2).toUpperCase()
  return parts.slice(0, 2).map(p => p[0].toUpperCase()).join('')
}

export default function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const btnRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const isPazientiActive =
    location.pathname.startsWith('/pazienti') ||
    location.pathname === '/nuovo-paziente'

  useEffect(() => {
    function handleClick(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  function handleLogout() {
    setMenuOpen(false)
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <NavLink to="/" className="topbar__brand" aria-label="Olivia — torna alla Home">
        <OliviaLogo height={40} />
      </NavLink>

      <nav className="topbar__nav" aria-label="Sezioni principali">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
          Home
        </NavLink>
        <NavLink to="/pazienti" className={isPazientiActive ? 'active' : ''}>
          Pazienti
        </NavLink>
        <NavLink to="/diete" className={({ isActive }) => isActive ? 'active' : ''}>
          Diete
        </NavLink>
      </nav>

      <div className="topbar__spacer" />

      <button
        ref={btnRef}
        className="topbar__avatar-btn"
        onClick={() => setMenuOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={String(menuOpen)}
        aria-label="Profilo utente"
      >
        <span className="avatar">{initials(user?.name)}</span>
      </button>

      {menuOpen && (
        <div ref={menuRef} className="user-menu" role="menu">
          <div className="user-menu__head">
            <div className="user-menu__name">{user?.name || 'Utente'}</div>
            <div className="user-menu__role">{user?.role || 'Nutrizionista'}</div>
            {user?.email && <div className="user-menu__role">{user.email}</div>}
          </div>
          <div className="user-menu__sep" />
          <button className="user-menu__item" role="menuitem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Profilo
          </button>
          <button className="user-menu__item" role="menuitem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Impostazioni studio
          </button>
          <div className="user-menu__sep" />
          <button className="user-menu__item" role="menuitem" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Esci
          </button>
        </div>
      )}
    </header>
  )
}
