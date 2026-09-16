const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const STORAGE_KEY = 'olivia.session'

export class UnauthorizedError extends Error {
  constructor(message = 'Non autorizzato') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

function stores() {
  return [window.localStorage, window.sessionStorage]
}

export function readSession() {
  for (const store of stores()) {
    let session = null
    try {
      const raw = store.getItem(STORAGE_KEY)
      if (raw) session = JSON.parse(raw)
    } catch {}
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
  } catch {}
}

export function clearSession() {
  for (const store of stores()) {
    try { store.removeItem(STORAGE_KEY) } catch {}
  }
}

export function authHeaders() {
  const session = readSession()
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {}
}

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
