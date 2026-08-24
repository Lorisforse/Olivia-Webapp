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

export async function getPatients() {
  return _json(await fetch(`${API_URL}/patients/`, { headers: authHeaders() }))
}

export async function getPatient(id) {
  return _json(await fetch(`${API_URL}/patients/${id}`, { headers: authHeaders() }))
}

export async function createPatient(payload) {
  return _json(await fetch(`${API_URL}/patients/`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify(payload),
  }))
}

export async function updatePatient(id, payload) {
  return _json(await fetch(`${API_URL}/patients/${id}`, {
    method: 'PATCH',
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify(payload),
  }))
}

export async function getPatientDiet(id) {
  return _json(await fetch(`${API_URL}/patients/${id}/diet`, { headers: authHeaders() }))
}

export async function assignDiet(patientId, dietId) {
  return _json(await fetch(`${API_URL}/patients/${patientId}/diet/${dietId}`, {
    method: 'POST',
    headers: authHeaders(),
  }))
}

export async function getPatientLogs(id, { from, to } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return _json(await fetch(`${API_URL}/patients/${id}/logs${qs ? '?' + qs : ''}`, { headers: authHeaders() }))
}

export async function getDailyReports(id, { from, to } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return _json(await fetch(`${API_URL}/patients/${id}/reports/daily${qs ? '?' + qs : ''}`, { headers: authHeaders() }))
}

export async function getWeeklyReports(id, { from, to } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return _json(await fetch(`${API_URL}/patients/${id}/reports/weekly${qs ? '?' + qs : ''}`, { headers: authHeaders() }))
}
