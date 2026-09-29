import { useEffect, useRef, useState } from 'react'

// Numero che sale da 0 al valore reale quando la statistica arriva dal server.
export function CountUp({ value, duration = 600 }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const target = Number(value)
    if (!Number.isFinite(target)) { setDisplay(value); return }
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) { setDisplay(target); prevRef.current = target; return }

    const start = Number.isFinite(prevRef.current) ? prevRef.current : 0
    const startTime = performance.now()
    let raf
    function tick(now) {
      const t = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(start + (target - start) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else prevRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return display
}

// Rametto d'ulivo per gli stati vuoti, in tono con il logo e il loader.
export function OliveSprig({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <path d="M15 29 C15 22, 15 16, 15 10 C15 6, 16 3, 19 1" stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="12" cy="9" rx="4.2" ry="2.6" fill="var(--brand)" transform="rotate(-35 12 9)" />
      <ellipse cx="18.5" cy="13.5" rx="4.4" ry="2.7" fill="var(--brand)" transform="rotate(20 18.5 13.5)" />
      <ellipse cx="12.5" cy="18" rx="4.2" ry="2.6" fill="var(--brand-300)" transform="rotate(-25 12.5 18)" />
      <ellipse cx="18" cy="22.5" rx="4" ry="2.5" fill="var(--brand-300)" transform="rotate(25 18 22.5)" />
    </svg>
  )
}
