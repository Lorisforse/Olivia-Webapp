import { useState } from 'react'

/**
 * Conferma in due passaggi per un'azione irreversibile: prima un avviso
 * esplicito (cosa viene cancellato), poi va ridigitato il nome del
 * paziente per sbloccare il bottone finale. `onConfirm` deve essere una
 * funzione async: se lancia, la modale resta aperta con un errore.
 */
export default function DeletePatientModal({ patient, onCancel, onConfirm }) {
  const [step, setStep] = useState(1)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  if (!patient) return null

  const name = patient.name || ''
  const matches = typed.trim().toLowerCase() === name.trim().toLowerCase() && name.trim() !== ''

  async function handleConfirm() {
    setDeleting(true)
    setError('')
    try {
      await onConfirm(patient)
    } catch {
      setError("Errore durante l'eliminazione. Riprova.")
      setDeleting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" role="dialog" aria-labelledby="deleteTitle" onClick={e => e.stopPropagation()}>
        {step === 1 ? (
          <>
            <div className="modal__header">
              <h2 className="modal__title" id="deleteTitle">Eliminare {name || 'questo paziente'}?</h2>
              <p className="modal__sub">
                Azione irreversibile: insieme alla scheda verranno cancellati anche tutti i log
                (pasti, peso, idratazione, umore) e i report generati dal bot per questo paziente.
              </p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={onCancel}>Annulla</button>
              <button className="btn btn--danger-ghost" onClick={() => setStep(2)}>Continua</button>
            </div>
          </>
        ) : (
          <>
            <div className="modal__header">
              <h2 className="modal__title" id="deleteTitle">Conferma eliminazione</h2>
              <p className="modal__sub">
                Scrivi <strong>{name}</strong> qui sotto per confermare.
              </p>
            </div>
            <div className="modal__body">
              <input
                className="input"
                autoFocus
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder={name}
                aria-label={`Scrivi "${name}" per confermare`}
              />
              {error && <div className="form-error" role="alert" style={{ marginTop: 12 }}><span>{error}</span></div>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={onCancel}>Annulla</button>
              <button
                className="btn btn--danger"
                onClick={handleConfirm}
                disabled={!matches || deleting}
              >
                {deleting ? 'Eliminazione…' : 'Elimina definitivamente'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
