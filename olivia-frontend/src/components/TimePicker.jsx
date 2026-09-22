import { Timepicker } from 'timepicker-ui-react'
import 'timepicker-ui/main.css'

function suggestedDate(hhmm) {
  const [h, m] = (hhmm || '00:00').split(':').map(Number)
  return new Date(2000, 0, 1, h || 0, m || 0)
}

/**
 * Selettore orario (timepicker-ui): input testuale con placeholder + modale
 * a quadrante analogico trascinabile. Il valore resta vuoto finché non si
 * preme "Conferma" nel modale: il placeholder mostra solo un orario
 * suggerito, non un valore già confermato.
 */
export default function TimePicker({ id, value, onChange, defaultTime = '00:00' }) {
  return (
    <Timepicker
      id={id}
      className="input"
      readOnly
      defaultValue={value || undefined}
      placeholder={defaultTime}
      onConfirm={({ hour, minutes }) => {
        if (hour == null || minutes == null) return
        onChange(`${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`)
      }}
      options={{
        clock: {
          type: '24h',
          currentTime: { time: suggestedDate(defaultTime), updateInput: false },
        },
        ui: {
          theme: 'basic',
          enableSwitchIcon: false,
          clearButton: false,
        },
        labels: {
          ok: 'Conferma',
          cancel: 'Annulla',
          time: 'Seleziona orario',
          hourLabel: 'Ora',
          minuteLabel: 'Minuti',
          clockLabel: 'Quadrante orario',
        },
      }}
    />
  )
}
