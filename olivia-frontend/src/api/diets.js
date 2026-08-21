import { authHeaders, notifyUnauthorized } from './auth'
import { UnauthorizedError, withDemo } from './demo'
import { getMockDiets, getMockDiet } from './mockData'

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
  return withDemo(
    async () => _json(await fetch(`${API_URL}/diets/`, { headers: authHeaders() })),
    getMockDiets,
  )
}

export async function getDiet(id) {
  return withDemo(
    async () => _json(await fetch(`${API_URL}/diets/${id}`, { headers: authHeaders() })),
    () => getMockDiet(id),
  )
}

export async function createDiet(payload) {
  return withDemo(
    async () => _json(await fetch(`${API_URL}/diets/`, {
      method: 'POST',
      headers: { ...JSON_HEADERS, ...authHeaders() },
      body: JSON.stringify(payload),
    })),
    () => ({
      id: `demo-diet-${Date.now()}`,
      name: payload.name,
      tips: [],
      weekly_plan: {},
      substitutions: '',
      created_at: new Date().toISOString(),
    }),
  )
}

export async function updateDiet(id, payload) {
  return withDemo(
    async () => _json(await fetch(`${API_URL}/diets/${id}`, {
      method: 'PATCH',
      headers: { ...JSON_HEADERS, ...authHeaders() },
      body: JSON.stringify(payload),
    })),
    () => null,
  )
}
