const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const STORAGE_KEY = 'olivia.session'

/**
 * Errore 401 del backend: credenziali non valide o sessione scaduta.
 * Va distinto dagli altri errori perché comporta un logout, non un errore generico.
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Non autorizzato') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

// "Resta connesso" = localStorage, che sopravvive alla chiusura del browser.
// Senza spunta si usa sessionStorage: la sessione muore con la scheda.
function stores() {
  return [window.localStorage, window.sessionStorage]
}

export function readSession() {
  for (const store of stores()) {
    let session = null
    try {
      const raw = store.getItem(STORAGE_KEY)
      if (raw) session = JSON.parse(raw)
    } catch {
      // storage non disponibile (private browsing) o JSON corrotto
    }
    if (!session) continue
    if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
      clearSession()
      return null
    }
    return session
  }
  return null
}

export function saveSession(session, remember) {
  clearSession()
  const store = remember ? window.localStorage : window.sessionStorage
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ ...session, remember: !!remember }))
  } catch {
    // se lo storage è pieno o bloccato la sessione resta solo in memoria
  }
}

export function clearSession() {
  for (const store of stores()) {
    try { store.removeItem(STORAGE_KEY) } catch { /* storage non disponibile */ }
  }
}

/** Header Authorization da aggiungere a ogni chiamata autenticata. */
export function authHeaders() {
  const session = readSession()
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {}
}

/** Il token non è più valido: si chiude la sessione e App.jsx riporta al login. */
export function notifyUnauthorized() {
  clearSession()
  window.dispatchEvent(new CustomEvent('olivia:unauthorized'))
}

export async function login({ email, password, remember }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, remember_me: !!remember }),
  })
  if (res.status === 401) throw new UnauthorizedError('Credenziali non valide')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const session = { token: data.access_token, expiresAt: data.expires_at, user: data.user }
  saveSession(session, remember)
  return session.user
}

/** Validazione della sessione salvata nel browser all'avvio dell'app. */
export async function fetchMe() {
  const res = await fetch(`${API_URL}/auth/me`, { headers: authHeaders() })
  if (res.status === 401) {
    notifyUnauthorized()
    throw new UnauthorizedError()
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function logout() {
  clearSession()
}
