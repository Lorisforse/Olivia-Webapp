import { useEffect, useState } from 'react'

/**
 * Conferma leggera, speculare a DeactivatePatientModal: un solo passaggio.
 * `onConfirm` deve essere una funzione async: se lancia, la modale resta
 * aperta con un errore. Lo stato locale si azzera ogni volta che si apre
 * (vedi useEffect) per non restare bloccato su "Riattivazione…" da una
 * conferma precedente.
 */
export default function ReactivatePatientModal({ patient, onCancel, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (patient) {
      setSaving(false)
      setError('')
    }
  }, [patient])

  if (!patient) return null

  const name = patient.name || 'questo paziente'

  async function handleConfirm() {
    setSaving(true)
    setError('')
    try {
      await onConfirm(patient)
    } catch {
      setError('Errore durante la riattivazione. Riprova.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" role="dialog" aria-labelledby="reactivateTitle" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title" id="reactivateTitle">Riattivare {name}?</h2>
          <p className="modal__sub">
            Il bot ricomincerà a rispondergli normalmente.
          </p>
        </div>
        {error && (
          <div className="modal__body">
            <div className="form-error" role="alert"><span>{error}</span></div>
          </div>
        )}
        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onCancel}>Annulla</button>
          <button className="btn btn--primary" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Riattivazione…' : 'Riattiva'}
          </button>
        </div>
      </div>
    </div>
  )
}
