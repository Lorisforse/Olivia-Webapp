import { useEffect, useRef, useState } from 'react'

/**
 * Tiene un flag di caricamento a `true` per almeno `minMs`, anche se il
 * valore sottostante torna `false` prima (fetch veloce/cache) — così
 * l'animazione di caricamento fa in tempo a essere vista invece di
 * lampeggiare per un istante. Non rallenta la fetch: solo la UI.
 */
export function useMinDuration(active, minMs = 700) {
  const [shown, setShown] = useState(active)
  const startedAt = useRef(active ? Date.now() : null)

  useEffect(() => {
    if (active) {
      startedAt.current = Date.now()
      setShown(true)
      return
    }
    if (startedAt.current == null) {
      setShown(false)
      return
    }
    const remaining = minMs - (Date.now() - startedAt.current)
    if (remaining <= 0) {
      setShown(false)
      return
    }
    const t = setTimeout(() => setShown(false), remaining)
    return () => clearTimeout(t)
  }, [active, minMs])

  return shown
}
