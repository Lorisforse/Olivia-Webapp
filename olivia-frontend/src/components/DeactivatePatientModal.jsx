import { useState } from 'react'

/**
 * Conferma leggera per un'azione reversibile: un solo passaggio, nessuna
 * ridigitazione del nome (a differenza della vecchia eliminazione, che era
 * irreversibile). `onConfirm` deve essere una funzione async: se lancia, la
 * modale resta aperta con un errore.
 */
export default function DeactivatePatientModal({ patient, onCancel, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!patient) return null

  const name = patient.name || 'questo paziente'

  async function handleConfirm() {
    setSaving(true)
    setError('')
    try {
      await onConfirm(patient)
    } catch {
      setError('Errore durante la disattivazione. Riprova.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" role="dialog" aria-labelledby="deactivateTitle" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title" id="deactivateTitle">Disattivare {name}?</h2>
          <p className="modal__sub">
            Il paziente sparisce dalle liste attive e il bot smette di rispondergli
            (riceverà un messaggio che non trova più il profilo). Scheda, log e piano
            alimentare restano intatti: puoi riattivarlo quando vuoi da questa stessa
            pagina e tutto torna come prima, bot compreso.
          </p>
        </div>
        {error && (
          <div className="modal__body">
            <div className="form-error" role="alert"><span>{error}</span></div>
          </div>
        )}
        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onCancel}>Annulla</button>
          <button className="btn btn--danger-ghost" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Disattivazione…' : 'Disattiva'}
          </button>
        </div>
      </div>
    </div>
  )
}
