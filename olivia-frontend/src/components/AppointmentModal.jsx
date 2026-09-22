import { useEffect, useMemo, useState } from 'react'
import {
  DURATIONS,
  appointmentStatus,
  fromInputs,
  reminderInfo,
  toDateInput,
  toTimeInput,
} from '../utils/appointments'

function emptyForm(initial) {
  const base = initial?.scheduled_at ? new Date(initial.scheduled_at) : null
  return {
    patient_id: initial?.patient_id || '',
    date: base ? toDateInput(base) : '',
    time: base ? toTimeInput(base) : '',
    duration_minutes: initial?.duration_minutes || 30,
    notes: initial?.notes || '',
  }
}

export default function AppointmentModal({
  open,
  appointment,
  initial,
  patients,
  config,
  onClose,
  onSave,
  onSetStatus,
  onDelete,
  onOpenPatient,
}) {
  const isEdit = Boolean(appointment)
  const [form, setForm] = useState(() => emptyForm(appointment || initial))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const patientOptions = useMemo(() => {
    const list = (patients || []).filter(p => p.active !== false || p.id === form.patient_id)
    return list
      .map(p => ({ id: p.id, name: p.name || 'Paziente senza nome', linked: Boolean(p.chat_id) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'it'))
  }, [patients, form.patient_id])

  if (!open) return null

  const status = isEdit ? appointmentStatus(appointment) : null
  const reminder = isEdit ? reminderInfo(appointment, config) : null
  const selectedPatient = patientOptions.find(p => p.id === form.patient_id)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: false }))
  }

  function validate() {
    const next = {}
    if (!form.patient_id) next.patient_id = true
    if (!form.date) next.date = true
    if (!form.time) next.time = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) {
      setError('Compila paziente, data e ora.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        scheduled_at: fromInputs(form.date, form.time).toISOString(),
        duration_minutes: Number(form.duration_minutes),
        notes: form.notes,
      }
      if (!isEdit) payload.patient_id = form.patient_id
      await onSave(payload, appointment)
    } catch {
      setError('Errore durante il salvataggio. Riprova.')
      setSaving(false)
    }
  }

  async function handleStatus(next) {
    setSaving(true)
    setError('')
    try {
      await onSetStatus(appointment, next)
    } catch {
      setError('Errore durante l\'aggiornamento dello stato. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    setError('')
    try {
      await onDelete(appointment)
    } catch {
      setError('Errore durante l\'eliminazione. Riprova.')
      setSaving(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" role="dialog" aria-labelledby="apptTitle" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title" id="apptTitle">
            {isEdit ? 'Appuntamento' : 'Nuovo appuntamento'}
          </h2>
          {isEdit ? (
            <div className="appt-modal__status">
              <span className={`pill pill--${status.pill}`}>{status.label}</span>
              {appointment.patient_name && <span className="muted">{appointment.patient_name}</span>}
              {onOpenPatient && (
                <button type="button" className="appt-modal__link" onClick={() => onOpenPatient(appointment)}>
                  Apri scheda
                </button>
              )}
            </div>
          ) : (
            <p className="modal__sub">
              {config?.bot_reminders_enabled
                ? `Il bot chiederà conferma al paziente ${config.reminder_days} giorni prima.`
                : 'Il bot in uso non supporta i promemoria: il paziente non riceverà notifiche.'}
            </p>
          )}
        </div>

        <div className="modal__body">
          {error && <div className="form-error" role="alert"><span>{error}</span></div>}

          <div className="form-grid" style={{ paddingTop: error ? 16 : 4 }}>
            {!isEdit && (
              <div className="field field--full">
                <label>Paziente <span className="req">*</span></label>
                <select
                  className={`select input${errors.patient_id ? ' invalid' : ''}`}
                  value={form.patient_id}
                  onChange={e => set('patient_id', e.target.value)}
                >
                  <option value="">Seleziona un paziente</option>
                  {patientOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.linked ? '' : ' (non collegato al bot)'}</option>
                  ))}
                </select>
                {selectedPatient && !selectedPatient.linked && config?.bot_reminders_enabled && (
                  <span className="field-help">Il paziente non è collegato al bot, non riceverà la notifica.</span>
                )}
              </div>
            )}

            <div className="field">
              <label>Data <span className="req">*</span></label>
              <input
                type="date"
                className={`input${errors.date ? ' invalid' : ''}`}
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Ora <span className="req">*</span></label>
              <input
                type="time"
                step="300"
                className={`input${errors.time ? ' invalid' : ''}`}
                value={form.time}
                onChange={e => set('time', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Durata</label>
              <select
                className="select input"
                value={form.duration_minutes}
                onChange={e => set('duration_minutes', e.target.value)}
              >
                {DURATIONS.map(d => <option key={d} value={d}>{d} minuti</option>)}
              </select>
            </div>
            <div className="field field--full">
              <label>Note</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Es. controllo mensile, portare esami"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>

          {isEdit && (
            <div className="appt-modal__section">
              <div className={`appt-reminder appt-reminder--${reminder.tone}`}>{reminder.text}</div>
              <div className="appt-modal__manual">
                <span className="appt-modal__manual-label">Segna a mano</span>
                <div className="appt-modal__manual-btns">
                  {status.key !== 'confirmed' && (
                    <button className="btn btn--secondary btn--sm" disabled={saving} onClick={() => handleStatus('confirmed')}>
                      Confermato
                    </button>
                  )}
                  {status.key !== 'reschedule' && (
                    <button className="btn btn--secondary btn--sm" disabled={saving} onClick={() => handleStatus('reschedule_requested')}>
                      Da rischedulare
                    </button>
                  )}
                  {(status.key === 'confirmed' || status.key === 'reschedule') && (
                    <button className="btn btn--ghost btn--sm" disabled={saving} onClick={() => handleStatus('scheduled')}>
                      Riporta a programmato
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal__footer">
          {isEdit && (
            <button
              className="btn btn--danger-ghost"
              style={{ marginRight: 'auto' }}
              disabled={saving}
              onClick={handleDelete}
            >
              {confirmDelete ? 'Confermi l\'eliminazione?' : 'Elimina'}
            </button>
          )}
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>Annulla</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio…' : isEdit ? 'Salva modifiche' : 'Crea appuntamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
