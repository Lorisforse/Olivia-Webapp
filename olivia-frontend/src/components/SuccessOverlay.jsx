import { useEffect } from 'react'

const CONFETTI_COLORS = ['#4A5528', '#8A9258', '#DAD4BF']

const CONFETTI = Array.from({ length: 8 }, (_, i) => ({
  angle: i * 45,
  delay: 0.25 + i * 0.03,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}))

const ICONS = {
  check: (
    <path
      className="success-badge__check"
      d="M22 37 L31 46 L50 26"
      fill="none"
      stroke="var(--brand)"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  pause: (
    <g className="success-badge__pause">
      <rect x="27" y="24" width="6" height="24" rx="2" fill="var(--warn)" />
      <rect x="39" y="24" width="6" height="24" rx="2" fill="var(--warn)" />
    </g>
  ),
}

const TONES = {
  brand: { fill: 'var(--brand-50)', stroke: 'var(--brand-100)' },
  warn: { fill: 'var(--warn-bg)', stroke: 'var(--warn)' },
}

export default function SuccessOverlay({ show, title, message, onDone, duration = 900, icon = 'check', tone = 'brand', confetti = true }) {
  useEffect(() => {
    if (!show || !onDone) return
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [show, onDone, duration])

  if (!show) return null

  const { fill, stroke } = TONES[tone] || TONES.brand

  return (
    <div className="success-overlay" role="status" aria-live="polite">
      <div className="success-card">
        <div className="success-badge">
          {confetti && (
            <div className="success-confetti">
              {CONFETTI.map((c, i) => (
                <span
                  key={i}
                  className="success-confetti__dot"
                  style={{ '--dot-angle': `${c.angle}deg`, '--dot-delay': `${c.delay}s`, '--dot-color': c.color }}
                />
              ))}
            </div>
          )}
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="34" fill={fill} stroke={stroke} strokeWidth="2" />
            {ICONS[icon] || ICONS.check}
          </svg>
        </div>
        <div className="success-card__title">{title}</div>
        {message && <div className="success-card__msg">{message}</div>}
      </div>
    </div>
  )
}
