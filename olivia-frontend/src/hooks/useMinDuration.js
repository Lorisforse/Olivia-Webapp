import { useEffect, useRef, useState } from 'react'

export function useMinDuration(active, minMs = 400) {
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
