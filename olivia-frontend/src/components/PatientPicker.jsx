import { useId, useMemo, useRef, useState } from 'react'

// Ricerca senza distinzione di maiuscole e accenti: "nicolo" trova "Nicolò".
function normalize(text) {
  return (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// options: [{ id, name, note? }] — note è un testo secondario mostrato accanto al nome.
export default function PatientPicker({ options, value, onChange, invalid = false, placeholder = 'Cerca paziente per nome o cognome…' }) {
  const listId = useId()
  const inputRef = useRef(null)
  const selected = options.find(o => o.id === value) || null
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    return q ? options.filter(o => normalize(o.name).includes(q)) : options
  }, [options, query])

  function openList() {
    setQuery('')
    setActive(0)
    setOpen(true)
  }

  function choose(option) {
    onChange(option.id)
    setQuery('')
    setOpen(false)
  }

  function clear() {
    onChange('')
    setQuery('')
    setOpen(true)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { openList(); return }
      setActive(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && filtered[active]) {
        e.preventDefault()
        choose(filtered[active])
      }
    } else if (e.key === 'Escape' && open) {
      // Chiude solo l'elenco, non la modale che contiene il campo.
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="picker">
      <div className="picker__control">
        <svg className="picker__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className={`input picker__input${invalid ? ' invalid' : ''}`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[active] ? `${listId}-${filtered[active].id}` : undefined}
          placeholder={selected ? '' : placeholder}
          value={open ? query : selected?.name || ''}
          onFocus={openList}
          onClick={() => { if (!open) openList() }}
          onBlur={() => setOpen(false)}
          onChange={e => { setQuery(e.target.value); setActive(0); setOpen(true) }}
          onKeyDown={handleKeyDown}
        />
        {selected && !open && (
          <button type="button" className="picker__clear" aria-label="Cambia paziente" onMouseDown={e => e.preventDefault()} onClick={clear}>
            ×
          </button>
        )}
      </div>

      {open && (
        <ul className="picker__list" id={listId} role="listbox">
          {filtered.map((o, i) => (
            <li
              key={o.id}
              id={`${listId}-${o.id}`}
              role="option"
              aria-selected={o.id === value}
              className={`picker__option${i === active ? ' is-active' : ''}${o.id === value ? ' is-selected' : ''}`}
              onMouseDown={e => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o)}
            >
              <span className="picker__name">{o.name}</span>
              {o.note && <span className="picker__note">{o.note}</span>}
            </li>
          ))}
          {filtered.length === 0 && <li className="picker__empty">Nessun paziente trovato</li>}
        </ul>
      )}
    </div>
  )
}
