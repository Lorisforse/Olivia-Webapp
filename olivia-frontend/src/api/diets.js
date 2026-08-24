import { authHeaders, notifyUnauthorized, UnauthorizedError } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function _json(res) {
  if (res.status === 401) {
    notifyUnauthorized()
    throw new UnauthorizedError()
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

export async function getDiets() {
  return _json(await fetch(`${API_URL}/diets/`, { headers: authHeaders() }))
}

export async function getDiet(id) {
  return _json(await fetch(`${API_URL}/diets/${id}`, { headers: authHeaders() }))
}

export async function createDiet(payload) {
  return _json(await fetch(`${API_URL}/diets/`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify(payload),
  }))
}

export async function updateDiet(id, payload) {
  return _json(await fetch(`${API_URL}/diets/${id}`, {
    method: 'PATCH',
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify(payload),
  }))
}
