import { useState, useMemo } from 'react'
import { Icon, StatPill, Avatar } from '../../components/ui'

const APPOINTMENTS = [
  { day: 1, start: 9,    end: 10,   name: 'Giulia Ricci',      type: 'Prima visita',  room: 'Studio 2' },
  { day: 1, start: 11,   end: 11.5, name: 'Alessandro Bianchi', type: 'Controllo',     room: 'Studio 1' },
  { day: 1, start: 14.5, end: 15.5, name: 'Luca Romano',        type: 'Controllo',     room: 'Studio 2' },
  { day: 2, start: 9.5,  end: 10.5, name: 'Sofia Greco',        type: 'Prima visita',  room: 'Studio 1' },
  { day: 2, start: 15,   end: 16,   name: 'Chiara Marino',      type: 'Controllo',     room: 'Studio 2' },
  { day: 3, start: 10,   end: 11,   name: 'Marco Ferrari',      type: 'Bioimpedenza',  room: 'Lab BIA' },
  { day: 3, start: 14,   end: 14.5, name: 'Francesca Esposito', type: 'Telefonica',    room: '—' },
  { day: 3, start: 16,   end: 17,   name: 'Matteo Russo',       type: 'Controllo',     room: 'Studio 1' },
  { day: 4, start: 9,    end: 10,   name: 'Elena Conti',        type: 'Prima visita',  room: 'Studio 2' },
  { day: 4, start: 11,   end: 12,   name: 'Davide Bruno',       type: 'Controllo',     room: 'Studio 1' },
  { day: 4, start: 15,   end: 15.5, name: 'Martina Gallo',      type: 'Telefonica',    room: '—' },
  { day: 5, start: 9.5,  end: 10.5, name: 'Andrea De Luca',     type: 'Controllo',     room: 'Studio 2' },
  { day: 5, start: 14,   end: 15,   name: 'Valentina Colombo',  type: 'Bioimpedenza',  room: 'Lab BIA' },
]

const TYPE_COLOR = {
  'Prima visita': '#1B4F8A',
  'Controllo': '#2E7D5E',
  'Bioimpedenza': '#6B4EA3',
  'Telefonica': '#B45309',
}

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì']
const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i)

function fmtHour(h) {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export default function AgendaPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = 13 + weekOffset * 7
  const todayIdx = 2

  const byDay = useMemo(() => {
    const m = {}
    APPOINTMENTS.forEach(a => { (m[a.day] = m[a.day] || []).push(a) })
    return m
  }, [])

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <div className="breadcrumbs mono">Clinica &nbsp;/&nbsp; Agenda</div>
          <h1 className="page-title">Agenda clinica</h1>
          <div className="stat-pills">
            <StatPill label="appuntamenti settimana" value={APPOINTMENTS.length} tone="blue" />
            <StatPill label="prime visite" value={APPOINTMENTS.filter(a => a.type === 'Prima visita').length} tone="green" />
            <StatPill label="telefoniche" value={APPOINTMENTS.filter(a => a.type === 'Telefonica').length} tone="amber" />
          </div>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--ghost"><Icon name="calendar" size={14} /> Sincronizza</button>
          <button className="btn btn--primary"><Icon name="plus" size={14} /> Nuovo appuntamento</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="agenda-nav">
          <button className="iconbtn iconbtn--light" onClick={() => setWeekOffset(w => w - 1)}>
            <Icon name="chevronLeft" size={12} />
          </button>
          <span className="agenda-nav__label">
            Settimana <span className="mono">{weekStart} – {weekStart + 4} apr 2026</span>
          </span>
          <button className="iconbtn iconbtn--light" onClick={() => setWeekOffset(w => w + 1)}>
            <Icon name="chevronRight" size={12} />
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setWeekOffset(0)}>Oggi</button>
        </div>
        <div className="seg" style={{ marginLeft: 12 }}>
          <button className="seg__btn">Giorno</button>
          <button className="seg__btn is-active">Settimana</button>
          <button className="seg__btn">Mese</button>
        </div>
        <div className="toolbar__right">
          {Object.entries(TYPE_COLOR).map(([type, color]) => (
            <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="legend-dot" style={{ background: color }} />
              <span className="small muted">{type}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="agenda card">
        <div className="agenda__corner" />
        {DAYS.map((d, i) => (
          <div key={d} className={`agenda__day-head${i === todayIdx ? ' is-today' : ''}`}>
            <div className="agenda__day-name">{d}</div>
            <div className="agenda__day-date mono">{weekStart + i} apr</div>
            {i === todayIdx && <span className="agenda__day-tag">oggi</span>}
          </div>
        ))}
        {HOURS.map(h => (
          <>
            <div key={h + '-h'} className="agenda__hour mono">{String(h).padStart(2, '0')}:00</div>
            {DAYS.map((d, di) => (
              <div key={d + h} className={`agenda__cell${di === todayIdx ? ' is-today' : ''}`} />
            ))}
          </>
        ))}
        {DAYS.map((d, di) => (byDay[di + 1] || []).map((a, ai) => {
          const top = (a.start - 8) * 48 + 42
          const height = (a.end - a.start) * 48 - 3
          return (
            <div
              key={di + '-' + ai}
              className="agenda__appt"
              style={{
                top: `${top}px`,
                height: `${height}px`,
                left: `calc(64px + ${di} * ((100% - 64px) / 5) + 3px)`,
                width: `calc((100% - 64px) / 5 - 6px)`,
                borderLeftColor: TYPE_COLOR[a.type],
              }}
            >
              <div className="agenda__appt-time mono">{fmtHour(a.start)}–{fmtHour(a.end)}</div>
              <div className="agenda__appt-name">{a.name}</div>
              <div className="agenda__appt-meta"><span>{a.type}</span> · <span className="mono">{a.room}</span></div>
            </div>
          )
        }))}
      </div>
    </div>
  )
}
