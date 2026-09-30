import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { METRICS, METRIC_LABELS } from '../utils/metrics'

function SlidersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  )
}

function ArrowIcon({ up }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={up ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
    </svg>
  )
}

// Pulsante "Personalizza" + pannello per scegliere ordine e visibilità dei grafici.
// La scelta è una sola per l'account e vale sia in Home sia nel tab Andamento.
export default function MetricsCustomizer({ metrics, onSave, defaultOrder, screen }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(metrics)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function openPanel() {
    setDraft(metrics)
    setError(null)
    setOpen(true)
  }

  function move(index, delta) {
    const next = [...draft]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    setDraft(next)
  }

  function toggle(key) {
    setDraft(draft.map(m => (m.key === key ? { ...m, visible: !m.visible } : m)))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      setOpen(false)
    } catch {
      setError('Salvataggio non riuscito, riprova.')
    } finally {
      setSaving(false)
    }
  }

  const onlyPatient = Object.fromEntries(METRICS.map(m => [m.key, !!m.onlyPatient]))

  return (
    <>
      <button type="button" className="btn btn--secondary btn--sm" onClick={openPanel}>
        <SlidersIcon /> Personalizza
      </button>

      {/* Portal su <body>: dentro .page (che ha un transform per l'animazione
          d'ingresso) il position:fixed della modale si riferirebbe alla pagina,
          non alla finestra, e su una Home lunga finirebbe fuori schermo. */}
      {open && createPortal(
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" role="dialog" aria-labelledby="metricsTitle" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title" id="metricsTitle">Personalizza i grafici</h2>
              <p className="modal__sub">
                Scegli quali grafici mostrare e in che ordine. La scelta vale per la Home e per
                l&#39;Andamento di ogni paziente, da qualsiasi computer.
              </p>
            </div>

            <div className="modal__body">
              <ol className="metrics-list">
                {draft.map((m, i) => (
                  <li key={m.key} className={`metrics-list__row${m.visible ? '' : ' is-hidden'}`}>
                    <label className="metrics-list__label">
                      <input type="checkbox" checked={m.visible} onChange={() => toggle(m.key)} />
                      <span>{METRIC_LABELS[m.key]}</span>
                      {screen === 'home' && onlyPatient[m.key] && (
                        <span className="metrics-list__note">solo scheda paziente</span>
                      )}
                    </label>
                    <div className="metrics-list__moves">
                      <button
                        type="button"
                        className="metrics-list__move"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        aria-label={`Sposta ${METRIC_LABELS[m.key]} su`}
                      >
                        <ArrowIcon up />
                      </button>
                      <button
                        type="button"
                        className="metrics-list__move"
                        onClick={() => move(i, 1)}
                        disabled={i === draft.length - 1}
                        aria-label={`Sposta ${METRIC_LABELS[m.key]} giù`}
                      >
                        <ArrowIcon />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              {screen === 'home' && (
                <p className="muted" style={{ fontSize: 12.5, margin: '12px 0 0' }}>
                  &laquo;Serve attenzione&raquo; resta sempre visibile in cima alla Home.
                </p>
              )}
              {error && <p className="metrics-list__error" role="alert">{error}</p>}
            </div>

            <div className="modal__footer metrics-footer">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setDraft(defaultOrder.map(key => ({ key, visible: true })))}
              >
                Ripristina ordine iniziale
              </button>
              <div className="form-footer-right">
                <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>Annulla</button>
                <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvataggio…' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
