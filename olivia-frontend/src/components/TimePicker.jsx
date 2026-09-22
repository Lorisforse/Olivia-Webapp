import RTP from 'react-time-picker'
import 'react-time-picker/dist/TimePicker.css'
import 'react-clock/dist/Clock.css'

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  )
}

/**
 * Selettore orario: input testuale (ore/minuti editabili da tastiera) più
 * quadrante analogico a comparsa (react-time-picker + react-clock).
 */
export default function TimePicker({ id, value, onChange }) {
  return (
    <RTP
      className="time-picker"
      id={id}
      value={value || null}
      onChange={v => onChange(v || '')}
      format="HH:mm"
      locale="it-IT"
      disableClock={false}
      clearIcon={null}
      clockIcon={<ClockIcon />}
      hourPlaceholder="--"
      minutePlaceholder="--"
    />
  )
}
