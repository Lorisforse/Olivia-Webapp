let _active = false

export function isDemoActive() { return _active }

export function activateDemo() {
  if (_active) return
  _active = true
  window.dispatchEvent(new CustomEvent('olivia:demo-activated'))
}

/**
 * Errore 401 del backend. Va distinto dagli altri: significa che il server c'è
 * e risponde, quindi non deve far scattare la modalità demo ma il logout.
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Non autorizzato') {
    super(message)
    this.name = 'UnauthorizedError'
  }
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
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err
    activateDemo()
    return mockFn()
  }
}
