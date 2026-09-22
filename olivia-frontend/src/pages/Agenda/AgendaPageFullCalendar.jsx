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
import { BOT_DISABLED_MSG, appointmentStatus } from '../../utils/appointments'
import './AgendaPageFullCalendar.css'

// Prova con una libreria pronta (FullCalendar) invece della griglia scritta a mano
// in AgendaPage.jsx — stessa logica di dati/modale, cambia solo il rendering della
// griglia. Route temporaneamente puntata qui da App.jsx per il confronto.

const STATUS_COLORS = {
  confirmed:   { bg: '#CBE0A0', border: '#A0C167', text: '#24350D' },
  reschedule:  { bg: '#F5B65B', border: '#DE9A2E', text: '#5C3600' },
  waiting:     { bg: '#BFD9E8', border: '#8FB8CC', text: '#1D3C4C' },
  scheduled:   { bg: '#E4E7D5', border: '#8A9258', text: '#3B4420' },
}

function Toast({ message, onHide }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onHide, 2400)
    return () => clearTimeout(t)
  }, [message, onHide])
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>
}

export default function AgendaPageFullCalendar() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [patients, setPatients] = useState([])
  const [config, setConfig] = useState(null)
  const [appts, setAppts] = useState([])
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
      setAppts(list)
    } catch {
      setError('Impossibile caricare gli appuntamenti.')
    } finally {
      setRangeLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [pts, cfg] = await Promise.all([getPatients(), getAppointmentsConfig()])
        if (cancelled) return
        setPatients(pts)
        setConfig(cfg)
      } catch {
        if (!cancelled) setError('Impossibile caricare l\'agenda. Riprova più tardi.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const patientId = searchParams.get('paziente')
    if (!patientId || loading) return
    setModal({ initial: { patient_id: patientId } })
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, loading])

  const refresh = useCallback(async () => {
    if (rangeRef.current) await loadRange(rangeRef.current.start, rangeRef.current.end)
  }, [loadRange])

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

  const events = useMemo(() => appts.map(a => {
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
      extendedProps: { appointment: a, statusLabel: s.label },
    }
  }), [appts])

  if (showLoading) return <LoadingScreen />

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Agenda · bozza con libreria (FullCalendar)</div>
          <h1 className="page-title">Appuntamenti</h1>
          <p className="page-subtitle">Trascina un appuntamento per spostarlo, trascina il bordo per cambiarne la durata.</p>
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

      <div className="card agenda-card agenda-fc-card">
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
          height="auto"
          editable
          eventResizableFromStart={false}
          selectable
          selectMirror
          events={events}
          datesSet={arg => loadRange(arg.start, arg.end)}
          select={arg => {
            setModal({ initial: { scheduled_at: arg.start.toISOString() } })
          }}
          eventClick={arg => {
            setModal({ appointment: arg.event.extendedProps.appointment })
          }}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventContent={arg => (
            <div className="fc-appt">
              <span className="fc-appt__time">{arg.timeText}</span>
              <span className="fc-appt__name">{arg.event.title}</span>
            </div>
          )}
        />
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
