import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients, assignDiet } from '../../api/patients'
import { getDiets } from '../../api/diets'

const STATUS_CONFIG = {
  active:  { label: 'Attivo',      pill: 'ok',   action: 'Vedi attività' },
  nodiet:  { label: 'Senza dieta', pill: 'warn', action: 'Assegna dieta' },
  waiting: { label: 'In attesa',   pill: 'wait', action: 'Invia link' },
}

function deriveStatus(p) {
  if (!p.chat_id) return 'waiting'
  if (!p.active_diet_plan_id) return 'nodiet'
  return 'active'
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatLastSeen(dt) {
  if (!dt) return null
  const diffH = Math.round((Date.now() - new Date(dt)) / 3600000)
  if (diffH < 1) return 'Poco fa'
  if (diffH < 24) return `${diffH}h fa`
  const days = Math.floor(diffH / 24)
  if (days < 7) return `${days}g fa`
  return new Date(dt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Toast({ message, onHide }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onHide, 2400)
    return () => clearTimeout(t)
  }, [message, onHide])
  return (
    <div className={`toast${message ? ' show' : ''}`}>{message}</div>
  )
}

export default function PazientiPage() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [diets, setDiets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState('')
  const [assignModal, setAssignModal] = useState(null)
  const [assignDietId, setAssignDietId] = useState('')
  const [assignDate, setAssignDate] = useState(new Date().toISOString().slice(0, 10))
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    Promise.all([getPatients(), getDiets()])
      .then(([p, d]) => {
        setPatients(p || [])
        setDiets(d || [])
        if (d?.length) setAssignDietId(d[0].id)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const dietMap = useMemo(() => {
    const m = {}
    diets.forEach(d => { m[d.id] = d.name })
    return m
  }, [diets])

  const enriched = useMemo(() =>
    patients.map(p => ({ ...p, _status: deriveStatus(p) })),
    [patients]
  )

  const filtered = useMemo(() => {
    let list = enriched.slice()
    if (filter !== 'all') list = list.filter(p => p._status === filter)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.living_at || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      )
    }
    const order = { active: 0, nodiet: 1, waiting: 2 }
    list.sort((a, b) => {
      if (order[a._status] !== order[b._status]) return order[a._status] - order[b._status]
      return (a.name || '').localeCompare(b.name || '')
    })
    return list
  }, [enriched, filter, query])

  const counts = useMemo(() => ({
    all: enriched.length,
    active: enriched.filter(p => p._status === 'active').length,
    nodiet: enriched.filter(p => p._status === 'nodiet').length,
    waiting: enriched.filter(p => p._status === 'waiting').length,
  }), [enriched])

  function showToast(msg) { setToast(msg) }

  function handleRowAction(e, patient) {
    e.stopPropagation()
    const st = patient._status
    if (st === 'active') navigate(`/pazienti/${patient.id}`)
    else if (st === 'nodiet') setAssignModal(patient)
    else showToast(`Link di onboarding inviato a ${patient.name}`)
  }

  const handleConfirmAssign = useCallback(async () => {
    if (!assignModal || !assignDietId) return
    setAssigning(true)
    try {
      await assignDiet(assignModal.id, assignDietId)
      setPatients(prev => prev.map(p =>
        p.id === assignModal.id ? { ...p, active_diet_plan_id: assignDietId } : p
      ))
      setAssignModal(null)
      showToast('Piano dietetico assegnato')
    } catch {
      showToast('Errore durante l\'assegnazione')
    } finally {
      setAssigning(false)
    }
  }, [assignModal, assignDietId])

  if (loading) return <div className="loading-screen">Caricamento pazienti…</div>
  if (error) return <div className="error-screen">Errore: {error}</div>

  return (
    <>
      <main className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Pazienti</h1>
            <p className="page-subtitle">
              {counts.all} pazienti totali · {counts.active} attivi · {counts.nodiet} senza dieta · {counts.waiting} in attesa
            </p>
          </div>
          <div className="page-actions">
            <button className="btn btn--primary" onClick={() => navigate('/nuovo-paziente')}>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuovo paziente
            </button>
          </div>
        </header>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="table-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Cerca per nome, città o email…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                ['all',     'Tutti'],
                ['active',  'Attivi'],
                ['nodiet',  'Senza dieta'],
                ['waiting', 'In attesa'],
              ].map(([v, l]) => (
                <button
                  key={v}
                  className={`table-filter${filter === v ? ' active' : ''}`}
                  onClick={() => setFilter(v)}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="table-count">
              {filtered.length} {filtered.length === 1 ? 'paziente' : 'pazienti'}
            </span>
          </div>

          <table className="data">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Nome</th>
                <th>Stato</th>
                <th>Dieta assegnata</th>
                <th>Ultima attività bot</th>
                <th className="col-actions">Azione</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--ink-4)' }}>
                    {query ? 'Nessun paziente corrisponde alla ricerca.' : 'Nessun paziente. Crea il primo!'}
                  </td>
                </tr>
              )}
              {filtered.map(p => {
                const st = p._status
                const cfg = STATUS_CONFIG[st]
                const dietName = p.active_diet_plan_id ? dietMap[p.active_diet_plan_id] : null
                const lastSeen = formatLastSeen(p.last_interaction_at)

                return (
                  <tr key={p.id} onClick={() => navigate(`/pazienti/${p.id}`)}>
                    <td>
                      <div className="cell-name">
                        <span className="cell-name__avatar">{getInitials(p.name)}</span>
                        <span>
                          <div className="cell-name__primary">{p.name || '—'}</div>
                          <div className="cell-name__sub">
                            {p.age ? `${p.age} anni` : '—'}{p.living_at ? ` · ${p.living_at}` : ''}
                          </div>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`pill pill--${cfg.pill}`}>{cfg.label}</span>
                    </td>
                    <td>
                      {dietName
                        ? <span style={{ color: 'var(--ink-2)' }}>{dietName}</span>
                        : <span className="cell-muted">— nessun piano —</span>
                      }
                    </td>
                    <td>
                      {lastSeen
                        ? <span>{lastSeen}</span>
                        : <span className="cell-muted">mai</span>
                      }
                    </td>
                    <td className="col-actions">
                      <button
                        className="btn btn--secondary btn--sm"
                        onClick={e => handleRowAction(e, p)}
                      >
                        {cfg.action}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      {assignModal && (
        <div className="modal-backdrop" onClick={() => setAssignModal(null)}>
          <div className="modal" role="dialog" aria-labelledby="assignTitle" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title" id="assignTitle">Assegna dieta</h2>
              <p className="modal__sub">
                Per {assignModal.name}{assignModal.age ? ` (${assignModal.age} anni)` : ''}{assignModal.goal ? ` · ${assignModal.goal}` : ''}.
              </p>
            </div>
            <div className="modal__body">
              <div className="field">
                <label htmlFor="assignSelect">Piano dietetico</label>
                <select
                  className="select"
                  id="assignSelect"
                  value={assignDietId}
                  onChange={e => setAssignDietId(e.target.value)}
                >
                  {diets.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                  {diets.length === 0 && <option value="">Nessun piano disponibile</option>}
                </select>
              </div>
              <div className="field mt-16">
                <label htmlFor="assignDate">Data inizio</label>
                <input
                  className="input"
                  type="date"
                  id="assignDate"
                  value={assignDate}
                  onChange={e => setAssignDate(e.target.value)}
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setAssignModal(null)}>Annulla</button>
              <button
                className="btn btn--primary"
                onClick={handleConfirmAssign}
                disabled={assigning || !assignDietId}
              >
                {assigning ? 'Assegnazione…' : 'Assegna piano'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} onHide={() => setToast('')} />
    </>
  )
}
