import {
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'

const TICK_STYLE = { fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 9, fill: '#8B8E80' }
const GRID_COLOR = '#E2DFD2'
const TARGET_COLOR = '#8B8E80'

function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const { label, value } = payload[0].payload
  if (value == null) return null
  return <div className="chart-tooltip">{`${label}: ${value}${unit}`}</div>
}

export function BarTrend({ data, target, unit = '', height = 140, color = 'var(--brand)', emptyLabel = 'Nessun dato nel periodo' }) {
  const values = data.map(d => d.value).filter(v => v != null)
  if (!values.length) return <div className="chart-empty">{emptyLabel}</div>

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
        <XAxis dataKey="label" tick={TICK_STYLE} tickLine={false} axisLine={false} />
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

export function LineTrend({ data, unit = '', height = 160, color = 'var(--brand)', emptyLabel = 'Nessun dato nel periodo' }) {
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
          width={34}
          domain={[yMin, yMax]}
          ticks={[yMin, yMid, yMax]}
          tickFormatter={v => v.toFixed(1)}
        />
        <XAxis dataKey="label" tick={TICK_STYLE} tickLine={false} axisLine={false} />
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

const STRIP_TONE = {
  good: { fill: '#CBE0A0', title: 'Buona aderenza' },
  warn: { fill: '#F5B65B', title: 'Aderenza parziale' },
  none: { fill: '#E3E4DA', title: 'Nessun dato' },
}

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
