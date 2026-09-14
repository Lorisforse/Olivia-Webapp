/**
 * Grafici minimi, coerenti con la palette dei pill di stato (verde=ok,
 * ambra=serve attenzione, grigio=nessun dato). SVG responsivo via viewBox
 * (nessuna libreria): le coordinate lavorano su una griglia fissa larga
 * `VBOX_W`, poi lo svg si adatta al contenitore via CSS.
 */

const VBOX_W = 600

/**
 * Barre con eventuale riga obiettivo tratteggiata. Pensato per percentuali
 * (aderenza) o quantità (idratazione) con un target chiaro. Le barre sotto
 * l'obiettivo sono più opache, stesso trucco già in uso nella vecchia bozza
 * di report. Tooltip nativo (`<title>`) su ogni barra al passaggio del mouse.
 */
export function BarTrend({ data, target, unit = '', height = 140, color = 'var(--brand)', emptyLabel = 'Nessun dato nel periodo' }) {
  const values = data.map(d => d.value).filter(v => v != null)
  if (!values.length) return <div className="chart-empty">{emptyLabel}</div>

  const pad = { l: 4, r: 4, t: 10, b: 18 }
  const w = VBOX_W - pad.l - pad.r
  const h = height - pad.t - pad.b
  const max = Math.max(target || 0, ...values, 1)
  const bw = w / data.length
  const y = v => pad.t + h - (v / max) * h
  const showLabelEvery = Math.max(1, Math.ceil(data.length / 8))

  return (
    <svg viewBox={`0 0 ${VBOX_W} ${height}`} className="chart-svg" role="img" aria-label="Grafico a barre">
      {target != null && (
        <line x1={pad.l} y1={y(target)} x2={VBOX_W - pad.r} y2={y(target)} className="chart-target-line" />
      )}
      {data.map((d, i) => {
        if (d.value == null) return null
        const barH = pad.t + h - y(d.value)
        const below = target != null && d.value < target
        return (
          <rect
            key={i}
            x={pad.l + i * bw + Math.max(1, bw * 0.12)}
            y={y(d.value)}
            width={Math.max(1, bw * 0.76)}
            height={barH}
            fill={color}
            opacity={below ? 0.5 : 0.95}
            rx="1.5"
          >
            <title>{`${d.label}: ${d.value}${unit}`}</title>
          </rect>
        )
      })}
      {data.map((d, i) => (i % showLabelEvery === 0) && (
        <text key={i} x={pad.l + i * bw + bw / 2} y={height - 5} className="chart-axis-label" textAnchor="middle">
          {d.axisLabel ?? d.label}
        </text>
      ))}
    </svg>
  )
}

/**
 * Linea con punti sui giorni con dato reale (i buchi non vengono collegati
 * né interpolati). Pensata per l'andamento peso: nessun target, solo il
 * trend nel tempo.
 */
export function LineTrend({ data, unit = '', height = 160, color = 'var(--brand)', emptyLabel = 'Nessun dato nel periodo' }) {
  const points = data.map((d, i) => ({ ...d, i })).filter(d => d.value != null)
  if (points.length < 2) return <div className="chart-empty">{emptyLabel}</div>

  const pad = { l: 34, r: 10, t: 12, b: 18 }
  const w = VBOX_W - pad.l - pad.r
  const h = height - pad.t - pad.b
  const values = points.map(p => p.value)
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const yMin = min - range * 0.15, yMax = max + range * 0.15
  const x = i => pad.l + (data.length === 1 ? 0 : (i / (data.length - 1)) * w)
  const y = v => pad.t + h - ((v - yMin) / (yMax - yMin)) * h
  const path = points.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${VBOX_W} ${height}`} className="chart-svg" role="img" aria-label="Grafico a linea">
      {[yMin, (yMin + yMax) / 2, yMax].map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={y(t)} x2={VBOX_W - pad.r} y2={y(t)} className="chart-gridline" />
          <text x={pad.l - 6} y={y(t) + 3} className="chart-axis-label" textAnchor="end">{t.toFixed(1)}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, k) => (
        <circle key={k} cx={x(p.i)} cy={y(p.value)} r="3" fill={color}>
          <title>{`${p.label}: ${p.value}${unit}`}</title>
        </circle>
      ))}
    </svg>
  )
}

const STRIP_TONE = {
  good: { fill: '#CBE0A0', title: 'Buona aderenza' },
  warn: { fill: '#F5B65B', title: 'Aderenza parziale' },
  none: { fill: '#E3E4DA', title: 'Nessun dato' },
}

/**
 * Striscia di quadratini, un giorno ciascuno: colpo d'occhio sulla continuità
 * (buchi = giorni non loggati), non sui numeri esatti. `days`:
 * [{ date, label, tone: 'good'|'warn'|'none' }], in ordine cronologico.
 */
export function AdherenceStrip({ days }) {
  if (!days.length) return <div className="chart-empty">Nessun dato nel periodo</div>
  return (
    <div>
      <div className="adherence-strip">
        {days.map((d, i) => (
          <span
            key={i}
            className="adherence-strip__cell"
            style={{ background: STRIP_TONE[d.tone].fill }}
            title={`${d.label} — ${STRIP_TONE[d.tone].title}`}
          />
        ))}
      </div>
      <div className="chart-legend">
        {Object.entries(STRIP_TONE).map(([k, v]) => (
          <span key={k} className="chart-legend__item">
            <span className="chart-legend__swatch" style={{ background: v.fill }} />
            {v.title}
          </span>
        ))}
      </div>
    </div>
  )
}
