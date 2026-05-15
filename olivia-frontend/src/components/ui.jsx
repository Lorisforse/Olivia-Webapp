export function Sparkbar({ data, height = 18, width = 72, color = '#1B4F8A', muted = '#DCE4EC' }) {
  const max = Math.max(1, ...data)
  const bw = width / data.length
  return (
    <svg width={width} height={height} style={{ display: 'block' }} aria-hidden="true">
      {data.map((v, i) => {
        const h = Math.max(1, (v / max) * (height - 2))
        return <rect key={i} x={i * bw + 0.5} y={height - h} width={bw - 1.5} height={h} fill={v === 0 ? muted : color} rx="0.5" />
      })}
    </svg>
  )
}

export function LineChart({ data, width = 520, height = 180, color = '#1B4F8A' }) {
  if (!data || !data.length) return null
  const pad = { l: 36, r: 12, t: 12, b: 22 }
  const w = width - pad.l - pad.r
  const h = height - pad.t - pad.b
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const yMin = min - range * 0.15, yMax = max + range * 0.15
  const x = i => pad.l + (i / (data.length - 1)) * w
  const y = v => pad.t + h - ((v - yMin) / (yMax - yMin)) * h
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const ticks = [yMin, (yMin + yMax) / 2, yMax]
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={y(t)} x2={width - pad.r} y2={y(t)} stroke="#E5ECF3" strokeWidth="0.5" />
          <text x={pad.l - 6} y={y(t) + 3} fontSize="10" fill="#7B8A99" textAnchor="end" fontFamily="IBM Plex Mono, monospace">{t.toFixed(1)}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke={color} strokeWidth="1.25" />
      {data.map((v, i) => i % 5 === 0 && <circle key={i} cx={x(i)} cy={y(v)} r="1.6" fill={color} />)}
      <text x={pad.l} y={height - 4} fontSize="10" fill="#7B8A99" fontFamily="IBM Plex Mono, monospace">giorno 1</text>
      <text x={width - pad.r} y={height - 4} fontSize="10" fill="#7B8A99" textAnchor="end" fontFamily="IBM Plex Mono, monospace">oggi</text>
    </svg>
  )
}

export function BarChart({ data, labels, width = 520, height = 180, color = '#1B4F8A', targetLine = null }) {
  const pad = { l: 36, r: 12, t: 12, b: 26 }
  const w = width - pad.l - pad.r, h = height - pad.t - pad.b
  const max = Math.max(targetLine || 0, ...data, 1)
  const bw = w / data.length
  const y = v => pad.t + h - (v / max) * h
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {[0, max / 2, max].map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={y(t)} x2={width - pad.r} y2={y(t)} stroke="#E5ECF3" strokeWidth="0.5" />
          <text x={pad.l - 6} y={y(t) + 3} fontSize="10" fill="#7B8A99" textAnchor="end" fontFamily="IBM Plex Mono, monospace">{t.toFixed(0)}</text>
        </g>
      ))}
      {targetLine != null && <line x1={pad.l} y1={y(targetLine)} x2={width - pad.r} y2={y(targetLine)} stroke="#2E7D5E" strokeWidth="0.75" strokeDasharray="3 3" />}
      {data.map((v, i) => (
        <rect key={i} x={pad.l + i * bw + 2} y={y(v)} width={bw - 4} height={pad.t + h - y(v)} fill={color} opacity={v < (targetLine || 0) ? 0.55 : 0.9} />
      ))}
      {labels && labels.map((l, i) => i % 2 === 0 && (
        <text key={i} x={pad.l + i * bw + bw / 2} y={height - 6} fontSize="9" fill="#7B8A99" textAnchor="middle" fontFamily="IBM Plex Mono, monospace">{l}</text>
      ))}
    </svg>
  )
}

export function AdherenceMeter({ value, width = 160 }) {
  const color = value >= 80 ? '#2E7D5E' : value >= 50 ? '#1B4F8A' : value > 0 ? '#B45309' : '#B7C0CA'
  return (
    <div className="adh-meter" style={{ width }}>
      <div className="adh-track"><div className="adh-fill" style={{ width: `${value}%`, background: color }} /></div>
      <span className="adh-val mono">{value}%</span>
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    active: { label: 'Attivo', color: '#2E7D5E' },
    pending: { label: 'In attesa', color: '#B45309' },
    'no-diet': { label: 'Senza dieta', color: '#8A96A3' },
  }
  const s = map[status] || map['no-diet']
  return (
    <span className="status-badge">
      <span className="dot" style={{ background: s.color, boxShadow: status === 'active' ? `0 0 0 3px ${s.color}22` : 'none' }} />
      {s.label}
    </span>
  )
}

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
