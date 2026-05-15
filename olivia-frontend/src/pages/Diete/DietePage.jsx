import { useState, useEffect, useMemo } from 'react'
import { getPatients, assignDiet as assignDietToPatient } from '../../api/patients'
import { getDiets, createDiet } from '../../api/diets'

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function deriveStatus(p) {
  if (!p.chat_id) return 'waiting'
  if (!p.active_diet_plan_id) return 'nodiet'
  return 'active'
}

const STATUS_CONFIG = {
  active:  { label: 'Attivo',      pill: 'ok' },
  nodiet:  { label: 'Senza dieta', pill: 'warn' },
  waiting: { label: 'In attesa',   pill: 'wait' },
}

export default function DietePage() {
  const [diets, setDiets] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadForm, setUploadForm] = useState({ name: '', kcal: '', desc: '' })
  const [uploadFile, setUploadFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewDiet, setPreviewDiet] = useState(null)
  const [assignDiet, setAssignDiet] = useState(null)
  const [assignQuery, setAssignQuery] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [assigning, setAssigning] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    Promise.all([getDiets(), getPatients()])
      .then(([d, p]) => { setDiets(d || []); setPatients(p || []) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }

  const patientCountByDiet = useMemo(() => {
    const m = {}
    patients.forEach(p => {
      if (p.active_diet_plan_id) m[p.active_diet_plan_id] = (m[p.active_diet_plan_id] || 0) + 1
    })
    return m
  }, [patients])

  const filtered = useMemo(() => {
    let list = [...diets].sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    )
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(d => (d.name || '').toLowerCase().includes(q))
    }
    return list
  }, [diets, query])

  const assignFiltered = useMemo(() => {
    if (!assignQuery.trim()) return patients
    const q = assignQuery.toLowerCase()
    return patients.filter(p => (p.name || '').toLowerCase().includes(q))
  }, [patients, assignQuery])

  async function handleUpload() {
    if (!uploadForm.name.trim()) { showToast('Inserisci il nome del piano'); return }
    setUploading(true)
    try {
      const newDiet = await createDiet({
        name: uploadForm.name.trim(),
        description: uploadForm.desc || null,
      })
      setDiets(d => [...d, newDiet])
      setUploadOpen(false)
      setUploadForm({ name: '', kcal: '', desc: '' })
      setUploadFile(null)
      showToast('Piano dietetico caricato')
    } catch (err) {
      showToast('Errore: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleAssignConfirm() {
    if (!selected.size) { showToast('Seleziona almeno un paziente'); return }
    setAssigning(true)
    try {
      await Promise.all(
        [...selected].map(patientId => assignDietToPatient(patientId, assignDiet.id))
      )
      setPatients(prev => prev.map(p =>
        selected.has(p.id) ? { ...p, active_diet_plan_id: assignDiet.id } : p
      ))
      const count = selected.size
      setSelected(new Set())
      setAssignDiet(null)
      showToast(`Piano assegnato a ${count} paziente${count === 1 ? '' : 'i'}`)
    } catch {
      showToast('Errore durante l\'assegnazione')
    } finally {
      setAssigning(false)
    }
  }

  function togglePatient(id) {
    setSelected(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setUploadFile(file)
      if (!uploadForm.name) setUploadForm(f => ({ ...f, name: file.name.replace(/\.pdf$/i, '') }))
    }
  }

  function handleFileInput(e) {
    const file = e.target.files[0]
    if (file) {
      setUploadFile(file)
      if (!uploadForm.name) setUploadForm(f => ({ ...f, name: file.name.replace(/\.pdf$/i, '') }))
    }
  }

  if (loading) return <div className="loading-screen">Caricamento piani dietetici…</div>
  if (error) return <div className="error-screen">Errore: {error}</div>

  return (
    <>
      <main className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Diete</h1>
            <p className="page-subtitle">Piani dietetici caricati — assegnali ai tuoi pazienti.</p>
          </div>
          <div className="page-actions">
            <button className="btn btn--primary" onClick={() => setUploadOpen(o => !o)}>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Carica PDF
            </button>
          </div>
        </header>

        {uploadOpen && (
          <div className="card mb-24">
            <div className="card__header">
              <h2 className="card__title">Carica un nuovo piano dietetico</h2>
              <button className="btn btn--ghost btn--sm" onClick={() => setUploadOpen(false)}>Chiudi</button>
            </div>
            <div className="card__body" style={{ padding: 20 }}>
              <label
                className={`upload${dragOver ? ' drag' : ''}`}
                htmlFor="fileInput"
                onDragEnter={e => { e.preventDefault(); setDragOver(true) }}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
                onDrop={handleDrop}
              >
                <input id="fileInput" type="file" accept="application/pdf" hidden onChange={handleFileInput} />
                <div style={{ width: 44, height: 44, margin: '0 auto 10px', borderRadius: '50%', background: 'var(--brand-50)', color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                </div>
                <div className="upload__title">
                  {uploadFile
                    ? uploadFile.name
                    : <>Trascina qui un file PDF o <span style={{ color: 'var(--brand)', textDecoration: 'underline', textUnderlineOffset: 2 }}>sfoglia</span></>
                  }
                </div>
                <div className="upload__hint">Solo .pdf · massimo 10 MB</div>
              </label>

              <div className="form-grid mt-16">
                <div className="field">
                  <label htmlFor="dietName">Nome del piano</label>
                  <input className="input" id="dietName" placeholder="es. Mediterranea 1800 kcal" value={uploadForm.name} onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="dietKcal">Kcal indicative</label>
                  <div className="input-wrap">
                    <input className="input input--with-suffix" id="dietKcal" type="number" placeholder="1800" value={uploadForm.kcal} onChange={e => setUploadForm(f => ({ ...f, kcal: e.target.value }))} />
                    <span className="suffix">kcal</span>
                  </div>
                </div>
                <div className="field field--full">
                  <label htmlFor="dietDesc">Descrizione breve</label>
                  <textarea className="textarea" id="dietDesc" placeholder="Note interne sul piano: scopo, durata, riferimenti…" value={uploadForm.desc} onChange={e => setUploadForm(f => ({ ...f, desc: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal__footer" style={{ borderTop: '1px solid var(--line-soft)' }}>
              <button className="btn btn--ghost" onClick={() => { setUploadOpen(false); setUploadForm({ name: '', kcal: '', desc: '' }); setUploadFile(null) }}>Annulla</button>
              <button className="btn btn--primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Caricamento…' : 'Carica piano'}
              </button>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="table-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" placeholder="Cerca piano…" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <span className="table-count">
              {filtered.length} {filtered.length === 1 ? 'piano' : 'piani'}
            </span>
          </div>

          <table className="data">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Nome del piano</th>
                <th>Pazienti assegnati</th>
                <th>Data di caricamento</th>
                <th>Dimensione</th>
                <th className="col-actions">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-4)' }}>
                    {query ? 'Nessun piano corrisponde alla ricerca.' : 'Nessun piano. Carica il primo!'}
                  </td>
                </tr>
              )}
              {filtered.map(d => {
                const count = patientCountByDiet[d.id] || 0
                return (
                  <tr key={d.id}>
                    <td>
                      <div className="cell-name">
                        <span className="cell-name__avatar" style={{ background: 'var(--brand-50)', color: 'var(--brand)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </span>
                        <span>
                          <div className="cell-name__primary">{d.name}</div>
                          <div className="cell-name__sub">PDF</div>
                        </span>
                      </div>
                    </td>
                    <td>
                      {count > 0
                        ? <span className="tag" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', borderColor: 'var(--brand-100)' }}>{count} paziente{count === 1 ? '' : 'i'}</span>
                        : <span className="cell-muted">— nessuno —</span>
                      }
                    </td>
                    <td className="cell-muted cell-mono">{formatDate(d.created_at)}</td>
                    <td className="cell-muted cell-mono">—</td>
                    <td className="col-actions">
                      <button className="btn btn--ghost btn--sm" style={{ marginRight: 4 }} onClick={() => setPreviewDiet(d)}>Vedi</button>
                      <button className="btn btn--secondary btn--sm" onClick={() => { setAssignDiet(d); setSelected(new Set()); setAssignQuery('') }}>Assegna</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Preview modal */}
      {previewDiet && (
        <div className="modal-backdrop" onClick={() => setPreviewDiet(null)}>
          <div className="modal modal--wide" role="dialog" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Anteprima piano</h2>
              <p className="modal__sub">PDF · sola lettura</p>
            </div>
            <div className="modal__body">
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 32, textAlign: 'center', minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand)', opacity: .7, marginBottom: 12 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="9" y1="13" x2="15" y2="13"/>
                  <line x1="9" y1="17" x2="15" y2="17"/>
                </svg>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink-2)' }}>{previewDiet.name}</div>
                <div style={{ fontSize: 12.5, marginTop: 4 }}>{formatDate(previewDiet.created_at)}</div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setPreviewDiet(null)}>Chiudi</button>
              <button className="btn btn--secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Scarica PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignDiet && (
        <div className="modal-backdrop" onClick={() => setAssignDiet(null)}>
          <div className="modal modal--assign" role="dialog" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Assegna piano dietetico</h2>
              <p className="modal__sub">Piano selezionato: {assignDiet.name}</p>
            </div>
            <div className="modal__body">
              <div className="table-search" style={{ width: '100%', minWidth: 0, marginBottom: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" placeholder="Cerca paziente…" value={assignQuery} onChange={e => setAssignQuery(e.target.value)} />
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
                {assignFiltered.map(p => {
                  const st = deriveStatus(p)
                  const cfg = STATUS_CONFIG[st]
                  const checked = selected.has(p.id)
                  return (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', background: checked ? 'var(--brand-50)' : 'transparent' }}>
                      <input type="checkbox" checked={checked} onChange={() => togglePatient(p.id)} style={{ width: 16, height: 16, accentColor: 'var(--brand)' }} />
                      <span className="cell-name__avatar" style={{ width: 28, height: 28, fontSize: 10.5 }}>{getInitials(p.name)}</span>
                      <span style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{p.name}</div>
                        <div className="cell-name__sub">{p.goal || '—'}{p.age ? ` · ${p.age} anni` : ''}</div>
                      </span>
                      <span className={`pill pill--${cfg.pill}`}>{cfg.label}</span>
                    </label>
                  )
                })}
                {assignFiltered.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Nessun paziente trovato</div>
                )}
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setAssignDiet(null)}>Annulla</button>
              <button className="btn btn--primary" onClick={handleAssignConfirm} disabled={assigning}>
                {assigning ? 'Assegnazione…' : `Assegna a ${selected.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  )
}
