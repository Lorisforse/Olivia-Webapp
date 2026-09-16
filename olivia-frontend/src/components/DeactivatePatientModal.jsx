import { useEffect, useState } from 'react'

export default function DeactivatePatientModal({ patient, onCancel, onConfirm }) {
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
            Il bot smetterà di rispondere. Puoi comunque consultare le sue informazioni
            e riattivarlo quando vuoi.
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
