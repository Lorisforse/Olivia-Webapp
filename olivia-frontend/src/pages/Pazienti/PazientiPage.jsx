import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients, assignDiet, deactivatePatient, reactivatePatient } from '../../api/patients'
import { getDiets } from '../../api/diets'
import LoadingScreen from '../../components/LoadingScreen'
import DeactivatePatientModal from '../../components/DeactivatePatientModal'
import ReactivatePatientModal from '../../components/ReactivatePatientModal'
import SuccessOverlay from '../../components/SuccessOverlay'
import { useMinDuration } from '../../hooks/useMinDuration'

const STATUS_CONFIG = {
  active:   { label: 'Attivo',      pill: 'ok',   action: 'Vedi attività' },
  nodiet:   { label: 'Senza dieta', pill: 'warn', action: 'Assegna dieta' },
  waiting:  { label: 'In attesa',   pill: 'wait', action: 'Onboarding' },
  inactive: { label: 'Disattivato', pill: 'off',  action: '' },
}

function deriveStatus(p) {
  if (p.active === false) return 'inactive'
  if (!p.active_diet_plan_id) return 'nodiet'
  if (!p.chat_id) return 'waiting'
  return 'active'
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  )
}
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  )
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

// Paziente silenzioso: pallino verde/giallo/rosso in base a quanto tempo è
// passato dall'ultimo messaggio al bot, null per chi non si è mai collegato
// (nessun allarme, non ha ancora iniziato).
function activityDotTone(dt) {
  if (!dt) return null
  const days = (Date.now() - new Date(dt)) / 86400000
  if (days < 2) return 'good'
  if (days < 7) return 'warn'
  return 'bad'
}
const ACTIVITY_DOT_TITLE = {
  good: 'Attivo di recente',
  warn: 'Non scrive al bot da qualche giorno',
  bad: 'Non scrive al bot da almeno una settimana',
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
  const showLoading = useMinDuration(loading)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState('')
  const [assignModal, setAssignModal] = useState(null)
  const [assignDietId, setAssignDietId] = useState('')
  const [assignDate, setAssignDate] = useState(new Date().toISOString().slice(0, 10))
  const [assigning, setAssigning] = useState(false)
  const [deactivateModal, setDeactivateModal] = useState(null)
  const [reactivateModal, setReactivateModal] = useState(null)
  const [statusOverlay, setStatusOverlay] = useState(null)

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
    const order = { active: 0, inactive: 1, nodiet: 2, waiting: 3 }
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
    inactive: enriched.filter(p => p._status === 'inactive').length,
  }), [enriched])

  function showToast(msg) { setToast(msg) }

  function handleRowAction(e, patient) {
    e.stopPropagation()
    const st = patient._status
    if (st === 'nodiet') setAssignModal(patient)
    else navigate(`/pazienti/${patient.id}?tab=bot`)
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

  const handleConfirmDeactivate = useCallback(async (patient) => {
    await deactivatePatient(patient.id)
    setPatients(prev => prev.map(p => p.id === patient.id ? { ...p, active: false } : p))
    setDeactivateModal(null)
    setStatusOverlay({
      icon: 'pause', tone: 'warn',
      title: 'Paziente disattivato',
      message: `${patient.name || 'Il paziente'} non riceverà più risposte dal bot.`,
    })
  }, [])

  const handleConfirmReactivate = useCallback(async (patient) => {
    await reactivatePatient(patient.id)
    setPatients(prev => prev.map(p => p.id === patient.id ? { ...p, active: true } : p))
    setReactivateModal(null)
    setStatusOverlay({
      icon: 'check', tone: 'brand',
      title: 'Paziente riattivato',
      message: `${patient.name || 'Il paziente'} torna a essere seguito dal bot.`,
    })
  }, [])

  if (showLoading) return <LoadingScreen label="Caricamento pazienti…" />
  if (error) return <div className="error-screen">Errore: {error}</div>

  return (
    <>
      <main className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Pazienti</h1>
            <p className="page-subtitle">
              {counts.all} pazienti totali · {counts.active} attivi · {counts.nodiet} senza dieta · {counts.waiting} in attesa
              {counts.inactive > 0 ? ` · ${counts.inactive} disattivati` : ''}
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
                ['all',      'Tutti'],
                ['active',   'Attivi'],
                ['nodiet',   'Senza dieta'],
                ['waiting',  'In attesa'],
                ['inactive', 'Disattivati'],
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
                const activityTone = activityDotTone(p.last_interaction_at)

                return (
                  <tr
                    key={p.id}
                    className={st === 'inactive' ? 'is-inactive' : ''}
                    onClick={() => navigate(`/pazienti/${p.id}`)}
                  >
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
                      {lastSeen ? (
                        <span>
                          <span className={`activity-dot activity-dot--${activityTone}`} title={ACTIVITY_DOT_TITLE[activityTone]} />
                          {lastSeen}
                        </span>
                      ) : (
                        <span className="cell-muted">mai</span>
                      )}
                    </td>
                    <td className="col-actions">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {st !== 'inactive' && (
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={e => handleRowAction(e, p)}
                          >
                            {cfg.action}
                          </button>
                        )}
                        <button
                          className={`btn-icon ${st === 'inactive' ? 'btn-icon--ok' : 'btn-icon--warn'}`}
                          onClick={e => {
                            e.stopPropagation()
                            if (st === 'inactive') setReactivateModal(p)
                            else setDeactivateModal(p)
                          }}
                          aria-label={st === 'inactive' ? `Riattiva ${p.name || 'paziente'}` : `Disattiva ${p.name || 'paziente'}`}
                          title={st === 'inactive' ? 'Riattiva paziente' : 'Disattiva paziente'}
                        >
                          {st === 'inactive' ? <PlayIcon /> : <PauseIcon />}
                        </button>
                      </div>
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

      <DeactivatePatientModal
        patient={deactivateModal}
        onCancel={() => setDeactivateModal(null)}
        onConfirm={handleConfirmDeactivate}
      />

      <ReactivatePatientModal
        patient={reactivateModal}
        onCancel={() => setReactivateModal(null)}
        onConfirm={handleConfirmReactivate}
      />

      <Toast message={toast} onHide={() => setToast('')} />

      <SuccessOverlay
        show={!!statusOverlay}
        icon={statusOverlay?.icon}
        tone={statusOverlay?.tone}
        confetti={false}
        duration={2200}
        title={statusOverlay?.title}
        message={statusOverlay?.message}
        onDone={() => setStatusOverlay(null)}
      />
    </>
  )
}
