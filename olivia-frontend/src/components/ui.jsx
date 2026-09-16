export function StatPill({ label, value, tone = 'neutral' }) {
  return (
    <span className={`stat-pill stat-pill--${tone}`}>
      <span className="stat-pill__v mono">{value}</span>
      <span className="stat-pill__l">{label}</span>
    </span>
  )
}

export function Avatar({ initials, size = 28, tone = 0 }) {
  const tones = [
    ['#E7EEF6', '#1B4F8A'], ['#E8F1EC', '#2E7D5E'], ['#F3ECE0', '#8A5A1E'],
    ['#EEE8F1', '#5B3A78'], ['#E6EDF0', '#2F4858'],
  ]
  const [bg, fg] = tones[tone % tones.length]
  return (
    <span className="avatar" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.42 }}>
      {initials}
    </span>
  )
}

export function Icon({ name, size = 16, color = 'currentColor' }) {
  const paths = {
    search: <><circle cx="7" cy="7" r="5" /><line x1="11" y1="11" x2="14" y2="14" /></>,
    plus: <><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></>,
    chevronDown: <polyline points="4,6 8,10 12,6" />,
    chevronRight: <polyline points="6,4 10,8 6,12" />,
    chevronLeft: <polyline points="10,4 6,8 10,12" />,
    arrowLeft: <><line x1="13" y1="8" x2="3" y2="8" /><polyline points="7,4 3,8 7,12" /></>,
    qr: <><rect x="2" y="2" width="5" height="5" /><rect x="9" y="2" width="5" height="5" /><rect x="2" y="9" width="5" height="5" /><rect x="9.5" y="9.5" width="1.5" height="1.5" /><rect x="12.5" y="9.5" width="1.5" height="1.5" /><rect x="9.5" y="12.5" width="1.5" height="1.5" /><rect x="12.5" y="12.5" width="1.5" height="1.5" /></>,
    close: <><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></>,
    filter: <polygon points="2,3 14,3 9,9 9,13 7,14 7,9" />,
    download: <><line x1="8" y1="2" x2="8" y2="11" /><polyline points="4,7 8,11 12,7" /><line x1="3" y1="14" x2="13" y2="14" /></>,
    print: <><rect x="3" y="7" width="10" height="6" /><rect x="5" y="2" width="6" height="5" /><rect x="5" y="10" width="6" height="4" fill="white" /></>,
    check: <polyline points="3,8 7,12 13,4" />,
    calendar: <><rect x="2" y="3" width="12" height="11" /><line x1="2" y1="6" x2="14" y2="6" /><line x1="5" y1="2" x2="5" y2="5" /><line x1="11" y1="2" x2="11" y2="5" /></>,
    chart: <polyline points="2,12 6,8 9,10 14,3" />,
    bot: <><rect x="3" y="5" width="10" height="8" rx="1" /><circle cx="6" cy="9" r="1" /><circle cx="10" cy="9" r="1" /><line x1="8" y1="2" x2="8" y2="5" /></>,
    alert: <><path d="M8 2 L14 13 L2 13 Z" /><line x1="8" y1="6" x2="8" y2="9" /><circle cx="8" cy="11" r="0.5" /></>,
    copy: <><rect x="4" y="4" width="8" height="9" /><polyline points="2,10 2,2 10,2" /></>,
    settings: <><circle cx="8" cy="8" r="2.5" /><path d="M8 1.5 L8 3 M8 13 L8 14.5 M1.5 8 L3 8 M13 8 L14.5 8 M3.3 3.3 L4.4 4.4 M11.6 11.6 L12.7 12.7 M12.7 3.3 L11.6 4.4 M4.4 11.6 L3.3 12.7" /></>,
    database: <><ellipse cx="8" cy="4" rx="5" ry="1.5" /><path d="M3 4 L3 12 C 3 13 5.5 13.5 8 13.5 C 10.5 13.5 13 13 13 12 L 13 4" /><path d="M3 8 C 3 9 5.5 9.5 8 9.5 C 10.5 9.5 13 9 13 8" /></>,
    apple: <><path d="M8 4 C 6 2 3 3 3 7 C 3 11 6 14 8 14 C 10 14 13 11 13 7 C 13 3 10 2 8 4 Z" /><path d="M8 4 C 8 3 9 2 10 2" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {paths[name]}
    </svg>
  )
}

export function Field({ label, children, span }) {
  return (
    <label className="field" style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <span className="field__l">{label}</span>
      {children}
    </label>
  )
}
