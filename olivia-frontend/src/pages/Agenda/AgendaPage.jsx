import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  getAppointmentsConfig,
  setAppointmentStatus,
  updateAppointment,
} from '../../api/appointments'
import { getPatients } from '../../api/patients'
import AppointmentModal from '../../components/AppointmentModal'
import LoadingScreen from '../../components/LoadingScreen'
import { useMinDuration } from '../../hooks/useMinDuration'
import {
  BOT_DISABLED_MSG,
  addDays,
  appointmentStatus,
  formatDayLabel,
  formatTime,
  sameDay,
  startOfWeek,
  toDateInput,
} from '../../utils/appointments'
import './AgendaPage.css'

const DAY_START = 8
const DAY_END = 20
const HOUR_H = 52
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function Toast({ message, onHide }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onHide, 2400)
    return () => clearTimeout(t)
  }, [message, onHide])
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>
}

function weekLabel(start) {
  const end = addDays(start, 6)
  const opts = { day: 'numeric', month: 'short' }
  const a = start.toLocaleDateString('it-IT', opts)
  const b = end.toLocaleDateString('it-IT', { ...opts, year: 'numeric' })
  return `${a} - ${b}`
}

function apptTop(a) {
  const d = new Date(a.scheduled_at)
  const minutes = (d.getHours() - DAY_START) * 60 + d.getMinutes()
  return Math.max(0, Math.min(minutes, (DAY_END - DAY_START) * 60 - 20)) / 60 * HOUR_H
}

function apptHeight(a) {
  return Math.max(22, (a.duration_minutes || 30) / 60 * HOUR_H - 2)
}

export default function AgendaPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [patients, setPatients] = useState([])
  const [config, setConfig] = useState(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [weekAppts, setWeekAppts] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekLoading, setWeekLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const showLoading = useMinDuration(loading)
  const today = useMemo(() => new Date(), [])
  const colRefs = useRef({})

  const loadWeek = useCallback(async (start) => {
    setWeekLoading(true)
    try {
      const list = await getAppointments({
        from: start.toISOString(),
        to: addDays(start, 7).toISOString(),
      })
      setWeekAppts(list)
    } catch {
      setError('Impossibile caricare gli appuntamenti della settimana.')
    } finally {
      setWeekLoading(false)
    }
  }, [])

  const loadUpcoming = useCallback(async () => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const list = await getAppointments({ from: now.toISOString(), to: addDays(now, 60).toISOString(), limit: 200 })
    setUpcoming(list)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [pts, cfg] = await Promise.all([getPatients(), getAppointmentsConfig()])
        if (cancelled) return
        setPatients(pts)
        setConfig(cfg)
        await loadUpcoming()
      } catch {
        if (!cancelled) setError('Impossibile caricare l\'agenda. Riprova più tardi.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [loadUpcoming])

  useEffect(() => { loadWeek(weekStart) }, [weekStart, loadWeek])

  useEffect(() => {
    const patientId = searchParams.get('paziente')
    if (!patientId || loading) return
    setModal({ initial: { patient_id: patientId } })
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, loading])

  const refresh = useCallback(async () => {
    await Promise.all([loadWeek(weekStart), loadUpcoming()])
  }, [loadWeek, loadUpcoming, weekStart])

  async function handleSave(payload, existing) {
    if (existing) {
      await updateAppointment(existing.id, payload)
      setToast('Appuntamento aggiornato')
    } else {
      await createAppointment(payload)
      setToast('Appuntamento creato')
    }
    setModal(null)
    await refresh()
  }

  async function handleSetStatus(existing, status) {
    const updated = await setAppointmentStatus(existing.id, status)
    setModal({ appointment: updated })
    setToast('Stato aggiornato')
    await refresh()
  }

  async function handleDelete(existing) {
    await deleteAppointment(existing.id)
    setModal(null)
    setToast('Appuntamento eliminato')
    await refresh()
  }

  function openNewAt(dayIndex, e) {
    const col = colRefs.current[dayIndex]
    if (!col) return
    const rect = col.getBoundingClientRect()
    const minutes = Math.floor(((e.clientY - rect.top) / HOUR_H) * 60 / 30) * 30
    const date = addDays(weekStart, dayIndex)
    const h = DAY_START + Math.floor(minutes / 60)
    const m = minutes % 60
    date.setHours(h, m, 0, 0)
    setModal({ initial: { scheduled_at: date.toISOString() } })
  }

  const byDay = useMemo(() => {
    const map = {}
    for (const a of weekAppts) {
      const idx = Math.floor((new Date(a.scheduled_at) - weekStart) / 86400000)
      if (idx < 0 || idx > 6) continue
      ;(map[idx] = map[idx] || []).push(a)
    }
    return map
  }, [weekAppts, weekStart])

  const upcomingByDay = useMemo(() => {
    const groups = []
    for (const a of upcoming) {
      const d = new Date(a.scheduled_at)
      const last = groups[groups.length - 1]
      if (last && sameDay(last.date, d)) last.items.push(a)
      else groups.push({ date: d, key: toDateInput(d), items: [a] })
    }
    return groups
  }, [upcoming])

  const counts = useMemo(() => {
    const c = { week: weekAppts.length, waiting: 0, reschedule: 0, confirmed: 0 }
    for (const a of upcoming) {
      const s = appointmentStatus(a).key
      if (s === 'waiting' || s === 'scheduled') c.waiting += 1
      if (s === 'reschedule') c.reschedule += 1
      if (s === 'confirmed') c.confirmed += 1
    }
    return c
  }, [weekAppts, upcoming])

  if (showLoading) return <LoadingScreen />

  const hours = []
  for (let h = DAY_START; h < DAY_END; h += 1) hours.push(h)

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Agenda</div>
          <h1 className="page-title">Appuntamenti</h1>
          <p className="page-subtitle">
            {counts.week} questa settimana · {counts.waiting} da confermare · {counts.reschedule} da rischedulare
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn--primary" onClick={() => setModal({ initial: {} })}>
            + Nuovo appuntamento
          </button>
        </div>
      </div>

      {error && <div className="form-error" role="alert" style={{ marginBottom: 20 }}><span>{error}</span></div>}

      {config && !config.bot_reminders_enabled && (
        <div className="plan-warn agenda-banner">
          <strong>Promemoria via bot non attivi.</strong>
          <span>{BOT_DISABLED_MSG} Conferme e richieste di rischedulazione vanno segnate a mano dalla scheda dell'appuntamento.</span>
        </div>
      )}

      <div className="agenda-layout">
        <section className="card agenda-card">
          <div className="card__header agenda-toolbar">
            <div className="agenda-nav">
              <button className="btn-icon" aria-label="Settimana precedente" onClick={() => setWeekStart(s => addDays(s, -7))}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button className="btn-icon" aria-label="Settimana successiva" onClick={() => setWeekStart(s => addDays(s, 7))}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              <span className="agenda-nav__label">{weekLabel(weekStart)}</span>
              {weekLoading && <span className="muted agenda-nav__loading">aggiorno…</span>}
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>Oggi</button>
          </div>

          <div className="agenda-scroll">
            <div className="agenda-grid">
              <div className="agenda-grid__corner" />
              {DAY_NAMES.map((name, i) => {
                const d = addDays(weekStart, i)
                const isToday = sameDay(d, today)
                return (
                  <div key={name} className={`agenda-grid__head${isToday ? ' is-today' : ''}`}>
                    <span className="agenda-grid__head-name">{name}</span>
                    <span className="agenda-grid__head-date">{d.getDate()}</span>
                  </div>
                )
              })}

              <div className="agenda-grid__hours" style={{ height: hours.length * HOUR_H }}>
                {hours.map(h => (
                  <div key={h} className="agenda-grid__hour" style={{ height: HOUR_H }}>
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {DAY_NAMES.map((name, i) => {
                const d = addDays(weekStart, i)
                const isToday = sameDay(d, today)
                const items = byDay[i] || []
                return (
                  <div
                    key={name}
                    ref={el => { colRefs.current[i] = el }}
                    className={`agenda-grid__col${isToday ? ' is-today' : ''}`}
                    style={{ height: hours.length * HOUR_H, backgroundSize: `100% ${HOUR_H}px` }}
                    onClick={e => openNewAt(i, e)}
                  >
                    {hours.map(h => (
                      <div key={h} className="agenda-grid__cell" style={{ height: HOUR_H }} />
                    ))}
                    {items.map(a => {
                      const s = appointmentStatus(a)
                      const past = new Date(a.scheduled_at) < today
                      const height = apptHeight(a)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          className={`agenda-appt agenda-appt--${s.key}${past ? ' is-past' : ''}${height < 40 ? ' agenda-appt--short' : ''}`}
                          style={{ top: apptTop(a), height }}
                          title={`${formatTime(a.scheduled_at)} · ${a.patient_name || 'Paziente'} · ${s.label}`}
                          onClick={e => { e.stopPropagation(); setModal({ appointment: a }) }}
                        >
                          <span className="agenda-appt__time">{formatTime(a.scheduled_at)}</span>
                          <span className="agenda-appt__name">{a.patient_name || 'Paziente'}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <aside className="card agenda-side">
          <div className="card__header">
            <h2 className="card__title">Prossimi appuntamenti</h2>
            <span className="muted" style={{ fontSize: 12 }}>60 giorni</span>
          </div>
          {upcomingByDay.length === 0 ? (
            <div className="card-empty-note muted">Nessun appuntamento in programma.</div>
          ) : (
            <div className="agenda-list">
              {upcomingByDay.map(group => (
                <div key={group.key} className="agenda-list__day">
                  <div className="agenda-list__day-label">{formatDayLabel(group.date)}</div>
                  {group.items.map(a => {
                    const s = appointmentStatus(a)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className="agenda-list__row"
                        onClick={() => setModal({ appointment: a })}
                      >
                        <span className="agenda-list__time">{formatTime(a.scheduled_at)}</span>
                        <span className="agenda-list__name">
                          {a.patient_name || 'Paziente'}
                          {!a.patient_linked && config?.bot_reminders_enabled && (
                            <span className="agenda-list__flag" title="Il paziente non è collegato al bot, non riceverà la notifica.">non collegato</span>
                          )}
                        </span>
                        <span className={`pill pill--${s.pill}`}>{s.label}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {modal && (
        <AppointmentModal
          key={modal.appointment?.id || 'new'}
          open
          appointment={modal.appointment || null}
          initial={modal.initial || null}
          patients={patients}
          config={config}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onSetStatus={handleSetStatus}
          onDelete={handleDelete}
          onOpenPatient={a => navigate(`/pazienti/${a.patient_id}`)}
        />
      )}

      <Toast message={toast} onHide={() => setToast('')} />
    </main>
  )
}
