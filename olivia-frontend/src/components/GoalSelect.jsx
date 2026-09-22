import { useEffect, useState } from 'react'
import { getGoalOptions, createGoalOption } from '../api/goalOptions'

const ADD_NEW = '__add_new__'

export default function GoalSelect({ id, value, onChange, invalid, emptyLabel = 'Seleziona un obiettivo…', emptyDisabled = false }) {
  const [options, setOptions] = useState([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getGoalOptions().then(setOptions).catch(() => setOptions([]))
  }, [])

  const values = options.map(o => o.value)
  // Se il paziente ha già un obiettivo non (più) tra le voci disponibili, resta comunque selezionato.
  const allValues = value && !values.includes(value) ? [...values, value] : values

  function handleSelect(e) {
    const v = e.target.value
    if (v === ADD_NEW) {
      setAdding(true)
      setDraft('')
      setError('')
      return
    }
    onChange(v)
  }

  async function handleConfirmAdd() {
    const v = draft.trim()
    if (!v) return
    setSaving(true)
    setError('')
    try {
      const created = await createGoalOption(v)
      setOptions(prev => (prev.some(o => o.value.toLowerCase() === created.value.toLowerCase()) ? prev : [...prev, created]))
      onChange(created.value)
      setAdding(false)
    } catch {
      setError('Impossibile salvare il nuovo obiettivo, riprova.')
    } finally {
      setSaving(false)
    }
  }

  if (adding) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            autoFocus
            placeholder="Scrivi il nuovo obiettivo…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirmAdd() } }}
          />
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAdding(false)} disabled={saving}>
            Annulla
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={handleConfirmAdd} disabled={saving || !draft.trim()}>
            {saving ? 'Salvo…' : 'Aggiungi'}
          </button>
        </div>
        {error && <p style={{ fontSize: 12, color: 'var(--danger)', margin: '6px 0 0' }}>{error}</p>}
      </div>
    )
  }

  return (
    <select className={`select${invalid ? ' invalid' : ''}`} id={id} value={value} onChange={handleSelect}>
      <option value="" disabled={emptyDisabled}>{emptyLabel}</option>
      {allValues.map(v => <option key={v} value={v}>{v}</option>)}
      <option value={ADD_NEW}>+ Aggiungi nuovo obiettivo…</option>
    </select>
  )
}
