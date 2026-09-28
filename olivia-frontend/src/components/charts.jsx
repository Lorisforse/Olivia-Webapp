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

export const ADHERENCE_TONE = {
  good: { fill: '#CBE0A0', title: 'Buona aderenza' },
  warn: { fill: '#F5B65B', title: 'Aderenza parziale' },
  none: { fill: '#E3E4DA', title: 'Nessun dato' },
}

export const SLEEP_TONE = {
  buona: { fill: '#CBE0A0', title: 'Sonno buono' },
  discreta: { fill: '#F5B65B', title: 'Sonno discreto' },
  scarsa: { fill: 'var(--danger-bg)', title: 'Sonno scarso' },
  none: { fill: '#E3E4DA', title: 'Nessun dato' },
}

export const HUNGER_TONE = {
  bassa: { fill: '#CBE0A0', title: 'Fame bassa' },
  moderata: { fill: '#F5B65B', title: 'Fame moderata' },
  alta: { fill: 'var(--danger-bg)', title: 'Fame alta' },
  none: { fill: '#E3E4DA', title: 'Nessun dato' },
}

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
// Fino a ~2 mesi: righe-settimana a tutta larghezza; oltre: un mini calendario per mese.
const WEEK_ROWS_MAX_DAYS = 62

function parseIsoDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toIsoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function mondayOf(d) {
  return addDays(d, -((d.getDay() + 6) % 7))
}

function CalendarCell({ date, entry, legend, showMonth }) {
  if (!entry) {
    return <span className="cal-cell cal-cell--out">{date.getDate()}</span>
  }
  const tone = legend[entry.tone] ?? legend.none
  const fullLabel = date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  return (
    <span className="cal-cell" style={{ background: tone.fill }} title={`${fullLabel}: ${tone.title}`}>
      {showMonth ? date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : date.getDate()}
    </span>
  )
}

function WeekRows({ first, last, byDate, legend }) {
  const cells = []
  const end = addDays(mondayOf(last), 6)
  for (let d = mondayOf(first); d <= end; d = addDays(d, 1)) cells.push(d)
  return (
    <div className="cal-grid cal-grid--wide">
      {WEEKDAYS.map((w, i) => <span key={i} className="cal-grid__dow">{w}</span>)}
      {cells.map(d => {
        const iso = toIsoDate(d)
        return (
          <CalendarCell
            key={iso}
            date={d}
            entry={byDate[iso]}
            legend={legend}
            showMonth={d.getDate() === 1 || iso === toIsoDate(first)}
          />
        )
      })}
    </div>
  )
}

function MonthGrids({ first, last, byDate, legend }) {
  const months = []
  for (let m = new Date(first.getFullYear(), first.getMonth(), 1); m <= last; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    months.push(m)
  }
  return (
    <div className="cal-months">
      {months.map(m => {
        const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()
        const offset = (m.getDay() + 6) % 7
        return (
          <div key={toIsoDate(m)} className="cal-month">
            <div className="cal-month__title">{m.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</div>
            <div className="cal-grid">
              {WEEKDAYS.map((w, i) => <span key={i} className="cal-grid__dow">{w}</span>)}
              {Array.from({ length: offset }, (_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = new Date(m.getFullYear(), m.getMonth(), i + 1)
                const iso = toIsoDate(d)
                return <CalendarCell key={iso} date={d} entry={byDate[iso]} legend={legend} />
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// days: [{ date: 'YYYY-MM-DD', tone }] in ordine, uno per ogni giorno del periodo scelto.
export function CategoryCalendar({ days, legend }) {
  if (!days.length) return <div className="chart-empty">Nessun dato nel periodo</div>
  const byDate = Object.fromEntries(days.map(d => [d.date, d]))
  const first = parseIsoDate(days[0].date)
  const last = parseIsoDate(days[days.length - 1].date)
  const Layout = days.length <= WEEK_ROWS_MAX_DAYS ? WeekRows : MonthGrids
  return (
    <div>
      <Layout first={first} last={last} byDate={byDate} legend={legend} />
      <div className="chart-legend">
        {Object.entries(legend).map(([k, v]) => (
          <span key={k} className="chart-legend__item">
            <span className="chart-legend__swatch" style={{ background: v.fill }} />
            {v.title}
          </span>
        ))}
      </div>
    </div>
  )
}
