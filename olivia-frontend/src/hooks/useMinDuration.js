import { useEffect, useRef, useState } from 'react'

/**
 * Tiene un flag di caricamento a `true` per almeno `minMs`, anche se il
 * valore sottostante torna `false` prima (fetch veloce/cache) — così
 * l'animazione di caricamento fa in tempo a essere vista invece di
 * lampeggiare per un istante. Non rallenta la fetch: solo la UI.
 */
// 1900ms copre un ciclo completo di andata e ritorno dell'oliva in
// LoadingScreen (animazione `loading-swing`, .9s per verso) più un margine.
export function useMinDuration(active, minMs = 1900) {
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
