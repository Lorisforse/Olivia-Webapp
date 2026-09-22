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
  if (res.status === 204) return null
  return res.json()
}

export async function getGoalOptions() {
  return _json(await fetch(`${API_URL}/goal-options`, { headers: authHeaders() }))
}

export async function createGoalOption(value) {
  return _json(await fetch(`${API_URL}/goal-options`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify({ value }),
  }))
}
