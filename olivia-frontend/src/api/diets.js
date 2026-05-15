import { withDemo } from './demo'
import { getMockDiets, getMockDiet } from './mockData'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function _json(res) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

export async function getDiets() {
  return withDemo(
    async () => _json(await fetch(`${API_URL}/diets/`)),
    getMockDiets,
  )
}

export async function getDiet(id) {
  return withDemo(
    async () => _json(await fetch(`${API_URL}/diets/${id}`)),
    () => getMockDiet(id),
  )
}

export async function createDiet(payload) {
  return withDemo(
    async () => _json(await fetch(`${API_URL}/diets/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })),
    () => null,
  )
}
