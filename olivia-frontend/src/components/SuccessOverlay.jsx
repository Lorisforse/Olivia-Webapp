import { useEffect } from 'react'

const CONFETTI_COLORS = ['#4A5528', '#8A9258', '#DAD4BF']

const CONFETTI = Array.from({ length: 8 }, (_, i) => ({
  angle: i * 45,
  delay: 0.25 + i * 0.03,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}))

/**
 * Overlay di conferma per azioni di creazione (nuovo paziente, ecc.):
 * badge con spunta animata + coriandoli, si chiude da sé dopo `duration` ms.
 */
export default function SuccessOverlay({ show, title, message, onDone, duration = 1500 }) {
  useEffect(() => {
    if (!show || !onDone) return
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [show, onDone, duration])

  if (!show) return null

  return (
    <div className="success-overlay" role="status" aria-live="polite">
      <div className="success-card">
        <div className="success-badge">
          <div className="success-confetti">
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                className="success-confetti__dot"
                style={{ '--dot-angle': `${c.angle}deg`, '--dot-delay': `${c.delay}s`, '--dot-color': c.color }}
              />
            ))}
          </div>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="34" fill="var(--brand-50)" stroke="var(--brand-100)" strokeWidth="2" />
            <path
              className="success-badge__check"
              d="M22 37 L31 46 L50 26"
              fill="none"
              stroke="var(--brand)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="success-card__title">{title}</div>
        {message && <div className="success-card__msg">{message}</div>}
      </div>
    </div>
  )
}
