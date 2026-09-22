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

export async function getAppointmentsConfig() {
  return _json(await fetch(`${API_URL}/appointments/config`, { headers: authHeaders() }))
}

export async function getAppointments({ from, to, patientId, limit } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (patientId) params.set('patient_id', patientId)
  if (limit) params.set('limit', String(limit))
  const qs = params.toString()
  return _json(await fetch(`${API_URL}/appointments/${qs ? `?${qs}` : ''}`, { headers: authHeaders() }))
}

export async function createAppointment(payload) {
  return _json(await fetch(`${API_URL}/appointments/`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify(payload),
  }))
}

export async function updateAppointment(id, payload) {
  return _json(await fetch(`${API_URL}/appointments/${id}`, {
    method: 'PUT',
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify(payload),
  }))
}

export async function setAppointmentStatus(id, status) {
  return _json(await fetch(`${API_URL}/appointments/${id}/status`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify({ status }),
  }))
}

export async function deleteAppointment(id) {
  return _json(await fetch(`${API_URL}/appointments/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }))
}
