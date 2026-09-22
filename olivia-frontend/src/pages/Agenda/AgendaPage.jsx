import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import itLocale from '@fullcalendar/core/locales/it'
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
  toDateInput,
} from '../../utils/appointments'
import './AgendaPage.css'

const STATUS_COLORS = {
  confirmed:  { bg: '#CBE0A0', border: '#A0C167', text: '#24350D' },
  reschedule: { bg: '#F5B65B', border: '#DE9A2E', text: '#5C3600' },
  waiting:    { bg: '#BFD9E8', border: '#8FB8CC', text: '#1D3C4C' },
  scheduled:  { bg: '#E4E7D5', border: '#8A9258', text: '#3B4420' },
}

function Toast({ message, onHide }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onHide, 2400)
    return () => clearTimeout(t)
  }, [message, onHide])
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>
}

export default function AgendaPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [patients, setPatients] = useState([])
  const [config, setConfig] = useState(null)
  const [viewAppts, setViewAppts] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)
  const [rangeLoading, setRangeLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const showLoading = useMinDuration(loading)
  const rangeRef = useRef(null)

  const loadRange = useCallback(async (start, end) => {
    rangeRef.current = { start, end }
    setRangeLoading(true)
    try {
      const list = await getAppointments({ from: start.toISOString(), to: end.toISOString() })
      setViewAppts(list)
    } catch {
      setError('Impossibile caricare gli appuntamenti.')
    } finally {
      setRangeLoading(false)
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

  useEffect(() => {
    const patientId = searchParams.get('paziente')
    if (!patientId || loading) return
    setModal({ initial: { patient_id: patientId } })
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, loading])

  const fcHoverCleanupRef = useRef(null)

  // FullCalendar non ha celle per (giorno, ora) nel DOM — le righe orarie e le
  // colonne-giorno sono renderizzate separatamente, quindi l'hover puro CSS
  // illuminerebbe tutta la riga o tutta la colonna. Un unico overlay spostato
  // via mousemove ricrea l'evidenziazione della cella precisa. Callback ref
  // invece di useEffect: il nodo compare solo dopo il caricamento iniziale
  // (LoadingScreen prima), un useEffect a mount fisso lo perderebbe.
  const setFcWrap = useCallback(node => {
    if (fcHoverCleanupRef.current) { fcHoverCleanupRef.current(); fcHoverCleanupRef.current = null }
    if (!node) return

    const hoverEl = document.createElement('div')
    hoverEl.className = 'fc-hover-cell'
    hoverEl.style.display = 'none'

    function onMove(e) {
      // Le colonne-giorno stanno sotto la tabella delle righe orarie nello
      // stacking (e.target sarebbe sempre .fc-timegrid-slot-lane): si cerca la
      // colonna per posizione invece che con closest().
      let col = null
      for (const c of node.querySelectorAll('.fc-timegrid-col[data-date]')) {
        const r = c.getBoundingClientRect()
        if (e.clientX >= r.left && e.clientX < r.right && e.clientY >= r.top && e.clientY < r.bottom) {
          col = c
          break
        }
      }
      const bg = col?.querySelector('.fc-timegrid-col-bg')
      if (!col || !bg) { hoverEl.style.display = 'none'; return }
      if (hoverEl.parentElement !== bg) bg.appendChild(hoverEl)
      const rect = col.getBoundingClientRect()
      const slotEl = node.querySelector('.fc-timegrid-slot-lane')
      const slotH = slotEl ? slotEl.getBoundingClientRect().height : rect.height / 24
      const idx = Math.floor((e.clientY - rect.top) / slotH)
      hoverEl.style.display = 'block'
      hoverEl.style.top = `${idx * slotH}px`
      hoverEl.style.height = `${slotH}px`
    }
    function onLeave() { hoverEl.style.display = 'none' }

    node.addEventListener('mousemove', onMove)
    node.addEventListener('mouseleave', onLeave)
    fcHoverCleanupRef.current = () => {
      node.removeEventListener('mousemove', onMove)
      node.removeEventListener('mouseleave', onLeave)
      hoverEl.remove()
    }
  }, [])

  const refresh = useCallback(async () => {
    const tasks = [loadUpcoming()]
    if (rangeRef.current) tasks.push(loadRange(rangeRef.current.start, rangeRef.current.end))
    await Promise.all(tasks)
  }, [loadRange, loadUpcoming])

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

  async function handleEventDrop(info) {
    try {
      await updateAppointment(info.event.id, { scheduled_at: info.event.start.toISOString() })
      setToast('Appuntamento spostato')
      await refresh()
    } catch {
      setToast('Impossibile spostare l\'appuntamento')
      info.revert()
    }
  }

  async function handleEventResize(info) {
    try {
      const minutes = Math.round((info.event.end - info.event.start) / 60000)
      await updateAppointment(info.event.id, { duration_minutes: minutes })
      setToast('Durata aggiornata')
      await refresh()
    } catch {
      setToast('Impossibile aggiornare la durata')
      info.revert()
    }
  }

  const events = useMemo(() => viewAppts.map(a => {
    const s = appointmentStatus(a)
    const colors = STATUS_COLORS[s.key] || STATUS_COLORS.scheduled
    const start = new Date(a.scheduled_at)
    const end = new Date(start.getTime() + (a.duration_minutes || 30) * 60000)
    return {
      id: a.id,
      title: a.patient_name || 'Paziente',
      start,
      end,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: { appointment: a },
    }
  }), [viewAppts])

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
    const c = { week: viewAppts.length, waiting: 0, reschedule: 0, confirmed: 0 }
    for (const a of upcoming) {
      const s = appointmentStatus(a).key
      if (s === 'waiting' || s === 'scheduled') c.waiting += 1
      if (s === 'reschedule') c.reschedule += 1
      if (s === 'confirmed') c.confirmed += 1
    }
    return c
  }, [viewAppts, upcoming])

  if (showLoading) return <LoadingScreen />

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Agenda</div>
          <h1 className="page-title">Appuntamenti</h1>
          <p className="page-subtitle">
            {counts.week} in vista · {counts.waiting} da confermare · {counts.reschedule} da rischedulare
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
        <section className="card agenda-card agenda-fc-card" ref={setFcWrap}>
          {rangeLoading && <span className="muted agenda-fc-card__loading">aggiorno…</span>}
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={itLocale}
            firstDay={1}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            nowIndicator
            height={800}
            expandRows
            displayEventEnd={false}
            editable
            eventResizableFromStart={false}
            selectable
            selectMirror
            events={events}
            datesSet={arg => loadRange(arg.start, arg.end)}
            select={arg => setModal({ initial: { scheduled_at: arg.start.toISOString() } })}
            eventClick={arg => setModal({ appointment: arg.event.extendedProps.appointment })}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventContent={arg => {
              const minutes = (arg.event.end - arg.event.start) / 60000
              const short = minutes <= 45
              return (
                <div className={`fc-appt${short ? ' fc-appt--short' : ''}`}>
                  <span className="fc-appt__time">{arg.timeText}</span>
                  <span className="fc-appt__name">{arg.event.title}</span>
                </div>
              )
            }}
          />
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
