let _active = false

export function isDemoActive() { return _active }

export function activateDemo() {
  if (_active) return
  _active = true
  window.dispatchEvent(new CustomEvent('olivia:demo-activated'))
}

const TIMEOUT_MS = 3000

export async function withDemo(realFn, mockFn) {
  if (_active) return mockFn()

  const race = Promise.race([
    realFn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
    ),
  ])

  try {
    return await race
  } catch {
    activateDemo()
    return mockFn()
  }
}
