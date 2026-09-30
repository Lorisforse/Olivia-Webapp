import {
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'

const TICK_STYLE = { fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 12, fill: 'var(--ink-3)' }
const X_TICK_GAP = 14
const GRID_COLOR = '#E2DFD2'
const TARGET_COLOR = '#8B8E80'

function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const { label, tip, value } = payload[0].payload
  if (value == null) return null
  return <div className="chart-tooltip">{`${tip ?? label}: ${value}${unit}`}</div>
}

export function BarTrend({ data, target, unit = '', height = 170, color = 'var(--brand)', emptyLabel = 'Nessun dato nel periodo' }) {
  const values = data.map(d => d.value).filter(v => v != null)
  if (!values.length) return <div className="chart-empty">{emptyLabel}</div>

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
        <XAxis dataKey="label" tick={TICK_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={X_TICK_GAP} />
        <YAxis hide domain={[0, dataMax => Math.max(dataMax, target ?? 0)]} />
        {target != null && (
          <ReferenceLine y={target} stroke={TARGET_COLOR} strokeDasharray="3 3" />
        )}
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={28}>
          {data.map((d, i) => (
            <Cell key={i} fill={color} opacity={target != null && d.value != null && d.value < target ? 0.5 : 0.95} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LineTrend({ data, unit = '', height = 190, color = 'var(--brand)', emptyLabel = 'Nessun dato nel periodo' }) {
  const values = data.map(d => d.value).filter(v => v != null)
  if (values.length < 2) return <div className="chart-empty">{emptyLabel}</div>

  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const yMin = min - range * 0.15, yMax = max + range * 0.15
  const yMid = (yMin + yMax) / 2

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <YAxis
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={46}
          domain={[yMin, yMax]}
          ticks={[yMin, yMid, yMax]}
          tickFormatter={v => v.toFixed(1)}
        />
        <XAxis dataKey="label" tick={TICK_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={X_TICK_GAP} />
        <Tooltip content={<ChartTooltip unit={unit} />} />
        <Line
          type="linear"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

const TONE_GOOD = '#B5D38A'
const TONE_MID = '#F5B65B'
const TONE_BAD = '#E8998A'
const TONE_NONE = '#E3E4DA'

export const ADHERENCE_TONE = {
  good: { fill: TONE_GOOD, title: 'Buona aderenza', short: 'buona' },
  warn: { fill: TONE_MID, title: 'Aderenza parziale', short: 'parziale' },
  none: { fill: TONE_NONE, title: 'Nessun dato', short: 'senza dati' },
}

export const SLEEP_TONE = {
  buona: { fill: TONE_GOOD, title: 'Sonno buono', short: 'buono' },
  discreta: { fill: TONE_MID, title: 'Sonno discreto', short: 'discreto' },
  scarsa: { fill: TONE_BAD, title: 'Sonno scarso', short: 'scarso' },
  none: { fill: TONE_NONE, title: 'Nessun dato', short: 'senza dati' },
}

export const HUNGER_TONE = {
  bassa: { fill: TONE_GOOD, title: 'Fame bassa', short: 'bassa' },
  moderata: { fill: TONE_MID, title: 'Fame moderata', short: 'moderata' },
  alta: { fill: TONE_BAD, title: 'Fame alta', short: 'alta' },
  none: { fill: TONE_NONE, title: 'Nessun dato', short: 'senza dati' },
}

function parseIsoDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function shortDate(iso) {
  return parseIsoDate(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

function weekStart(iso) {
  const d = parseIsoDate(iso)
  d.setDate(d.getDate() - (d.getDay() + 6) % 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Una casella per settimana, col colore più frequente tra i giorni che hanno un dato.
function groupByWeek(days) {
  const weeks = []
  const byWeek = {}
  days.forEach(d => {
    const w = weekStart(d.date)
    if (!byWeek[w]) { byWeek[w] = {}; weeks.push(w) }
    if (d.tone !== 'none') byWeek[w][d.tone] = (byWeek[w][d.tone] || 0) + 1
  })
  return weeks.map(w => {
    const counts = Object.entries(byWeek[w]).sort((a, b) => b[1] - a[1])
    return { date: w, tone: counts.length ? counts[0][0] : 'none', week: true }
  })
}

function countTones(days, legend) {
  const counts = {}
  days.forEach(d => { counts[d.tone] = (counts[d.tone] || 0) + 1 })
  return Object.keys(legend).filter(k => counts[k]).map(k => ({ key: k, n: counts[k], ...legend[k] }))
}

function cellTitle(cell, tone) {
  if (cell.week) return `Settimana dal ${shortDate(cell.date)}: ${tone.title.toLowerCase()} (prevalente)`
  const label = parseIsoDate(cell.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${label}: ${tone.title}`
}

// rows: [{ key, label, days: [{ date: 'YYYY-MM-DD', tone }], legend }], stesse date per tutte le righe.
export function DailyDiary({ rows, weekly = false }) {
  const days = rows[0]?.days ?? []
  if (!days.length) return <div className="chart-empty">Nessun dato nel periodo</div>

  const cellsByRow = rows.map(r => (weekly ? groupByWeek(r.days) : r.days))
  const axisCells = cellsByRow[0]
  const n = axisCells.length
  const fractions = n < 10 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]
  const tickIdx = [...new Set(fractions.map(f => Math.round(f * (n - 1))))]

  return (
    <div className="diary">
      {rows.map((row, i) => (
        <div key={row.key} className="diary__row">
          <div className="diary__head">
            <span className="diary__label">{row.icon}{row.label}</span>
            <span className="diary__counts">
              {countTones(row.days, row.legend).map(c => (
                <span key={c.key} className="diary__count">
                  <span className="diary__dot" style={{ background: c.fill }} />
                  {c.n} gg {c.short}
                </span>
              ))}
            </span>
          </div>
          <div className="diary__strip">
            {cellsByRow[i].map(cell => {
              const tone = row.legend[cell.tone] ?? row.legend.none
              return <span key={cell.date} style={{ background: tone.fill }} title={cellTitle(cell, tone)} />
            })}
          </div>
        </div>
      ))}
      <div className="diary__axis">
        {tickIdx.map((idx, k) => (
          <span
            key={idx}
            style={{ left: `${((idx + 0.5) / n) * 100}%` }}
            className={k === 0 ? 'is-first' : k === tickIdx.length - 1 ? 'is-last' : ''}
          >
            {shortDate(axisCells[idx].date)}
          </span>
        ))}
      </div>
    </div>
  )
}
