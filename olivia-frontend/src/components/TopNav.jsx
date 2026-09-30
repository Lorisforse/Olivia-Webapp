import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import OliviaLogo from './OliviaLogo'
import { useAuth } from '../context/AuthContext'

const HONORIFICS = /^(dr|dr\.ssa|dott|dott\.ssa|prof|prof\.ssa|sig|sig\.ra)\.?$/i

function initials(name) {
  const parts = String(name || '').split(/\s+/).filter(p => p && !HONORIFICS.test(p))
  if (!parts.length) return String(name || '?').slice(0, 2).toUpperCase()
  return parts.slice(0, 2).map(p => p[0].toUpperCase()).join('')
}

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/pazienti', label: 'Pazienti', icon: 'users' },
  { to: '/diete', label: 'Diete', icon: 'leaf' },
  { to: '/agenda', label: 'Agenda', icon: 'calendar' },
]

const ICON_PATHS = {
  home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
}

function NavIcon({ name }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  )
}

export default function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const btnRef = useRef(null)
  const navRef = useRef(null)
  const [indicator, setIndicator] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const isPazientiActive =
    location.pathname.startsWith('/pazienti') ||
    location.pathname === '/nuovo-paziente'

  useLayoutEffect(() => {
    function measure() {
      const active = navRef.current?.querySelector('a.active')
      if (!active) { setIndicator(null); return }
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [location.pathname])

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

      <nav className="topbar__nav" aria-label="Sezioni principali" ref={navRef}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              (item.to === '/pazienti' ? isPazientiActive : isActive) ? 'active' : ''
            }
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        {indicator && (
          <span
            className="topbar__nav-indicator"
            style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
            aria-hidden="true"
          />
        )}
      </nav>

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
