export const BOT_DISABLED_MSG =
  'Il bot in uso non supporta i promemoria: il paziente non riceverà notifiche per gli appuntamenti.'
export const PATIENT_NOT_LINKED_MSG =
  'Il paziente non è collegato al bot, non riceverà la notifica.'
export const PATIENT_INACTIVE_MSG =
  'Il paziente è disattivato: il bot non gli invierà la notifica.'

export const DURATIONS = [15, 30, 45, 60, 90]

export function appointmentStatus(a) {
  if (a.status === 'confirmed') return { key: 'confirmed', label: 'Confermato', pill: 'ok' }
  if (a.status === 'reschedule_requested') return { key: 'reschedule', label: 'Da rischedulare', pill: 'warn' }
  if (a.reminder_sent_at) return { key: 'waiting', label: 'In attesa di risposta', pill: 'wait' }
  return { key: 'scheduled', label: 'Programmato', pill: 'info' }
}

export function reminderInfo(a, config) {
  if (config && !config.bot_reminders_enabled) return { tone: 'warn', text: BOT_DISABLED_MSG }
  if (!a.patient_linked) return { tone: 'warn', text: PATIENT_NOT_LINKED_MSG }
  if (a.patient_active === false) return { tone: 'warn', text: PATIENT_INACTIVE_MSG }
  if (a.reminder_sent_at) {
    let text = `Promemoria inviato il ${formatDateTime(a.reminder_sent_at)}.`
    if (a.responded_at) {
      const via = a.responded_via === 'bot' ? 'dal paziente via bot' : 'dalla nutrizionista'
      text += ` Risposta ${via} il ${formatDateTime(a.responded_at)}.`
    }
    return { tone: 'ok', text }
  }
  if (a.reminder_at) return { tone: 'muted', text: `Promemoria previsto per ${formatDateTime(a.reminder_at)}.` }
  return { tone: 'muted', text: 'Nessun promemoria: appuntamento troppo vicino.' }
}

export function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function toDateInput(date) {
  const d = new Date(date)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function toTimeInput(date) {
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function fromInputs(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, h, mi, 0, 0)
}

export function formatTime(dt) {
  return new Date(dt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(dt) {
  const d = new Date(dt)
  return `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} alle ${formatTime(d)}`
}

export function formatLongDate(dt) {
  const s = new Date(dt).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatDayLabel(dt) {
  const d = new Date(dt)
  const today = new Date()
  if (sameDay(d, today)) return 'Oggi'
  if (sameDay(d, addDays(today, 1))) return 'Domani'
  return formatLongDate(d)
}
