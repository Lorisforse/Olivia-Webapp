import { withDemo } from './demo'
import { getMockPatients, getMockPatient, getMockLogs } from './mockData'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function _json(res) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

export async function getPatients() {
  return withDemo(
    async () => _json(await fetch(`${API_URL}/patients/`)),
    getMockPatients,
  )
}

export async function getPatient(id) {
  return withDemo(
    async () => _json(await fetch(`${API_URL}/patients/${id}`)),
    () => getMockPatient(id),
  )
}

export async function createPatient(payload) {
  return withDemo(
    async () => _json(await fetch(`${API_URL}/patients/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })),
    () => ({ id: `demo-new-${Date.now()}`, ...payload }),
  )
}

export async function updatePatient(id, payload) {
  return withDemo(
    async () => _json(await fetch(`${API_URL}/patients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })),
    () => null,
  )
}

export async function getPatientDiet(id) {
  return withDemo(
    async () => _json(await fetch(`${API_URL}/patients/${id}/diet`)),
    () => null,
  )
}

export async function assignDiet(patientId, dietId) {
  return withDemo(
    async () => _json(await fetch(`${API_URL}/patients/${patientId}/diet/${dietId}`, { method: 'POST' })),
    () => null,
  )
}

export async function getPatientLogs(id, { from, to } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return withDemo(
    async () => _json(await fetch(`${API_URL}/patients/${id}/logs${qs ? '?' + qs : ''}`)),
    () => getMockLogs(id),
  )
}

export async function getDailyReports(id, { from, to } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return withDemo(
    async () => _json(await fetch(`${API_URL}/patients/${id}/reports/daily${qs ? '?' + qs : ''}`)),
    () => ({ days: [] }),
  )
}

export async function getWeeklyReports(id, { from, to } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return withDemo(
    async () => _json(await fetch(`${API_URL}/patients/${id}/reports/weekly${qs ? '?' + qs : ''}`)),
    () => ({ weeks: [] }),
  )
}
