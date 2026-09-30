import { authHeaders, notifyUnauthorized, UnauthorizedError } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function _json(res) {
  if (res.status === 401) {
    notifyUnauthorized()
    throw new UnauthorizedError()
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    err.detail = detail
    throw err
  }
  return res.json()
}

export async function getPreferences() {
  return _json(await fetch(`${API_URL}/auth/me/preferences`, { headers: authHeaders() }))
}

export async function savePreferences(metrics) {
  return _json(await fetch(`${API_URL}/auth/me/preferences`, {
    method: 'PUT',
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify({ metrics }),
  }))
}
