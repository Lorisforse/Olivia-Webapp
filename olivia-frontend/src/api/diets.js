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

export async function deleteDiet(id) {
  return _json(await fetch(`${API_URL}/diets/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }))
}

export async function parseDietPdf(file) {
  const body = new FormData()
  body.append('file', file)
  return _json(await fetch(`${API_URL}/diets/parse-pdf`, {
    method: 'POST',
    headers: authHeaders(),
    body,
  }))
}

export async function uploadDietPdf(id, file) {
  const body = new FormData()
  body.append('file', file)
  return _json(await fetch(`${API_URL}/diets/${id}/pdf`, {
    method: 'POST',
    headers: authHeaders(),
    body,
  }))
}

export async function downloadDietPdf(id) {
  const res = await fetch(`${API_URL}/diets/${id}/pdf`, { headers: authHeaders() })
  if (res.status === 401) {
    notifyUnauthorized()
    throw new UnauthorizedError()
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') || ''
  const match = /filename="([^"]+)"/.exec(cd)
  return { blob, filename: match ? match[1] : 'dieta.pdf' }
}
