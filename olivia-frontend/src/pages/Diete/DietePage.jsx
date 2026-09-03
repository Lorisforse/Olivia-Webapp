import { useState, useEffect, useMemo } from 'react'
import { getPatients, assignDiet as assignDietToPatient } from '../../api/patients'
import { getDiets, createDiet, updateDiet, deleteDiet, parseDietPdf, uploadDietPdf, downloadDietPdf } from '../../api/diets'
import LoadingScreen from '../../components/LoadingScreen'
import WeeklyPlanGrid from '../../components/WeeklyPlanGrid'
import { useMinDuration } from '../../hooks/useMinDuration'
import { saveBlob } from '../../utils/download'
import { DAYS, MEALS, dayLabel, mealLabel, emptyPlan, planFromApi, planToApi, countCells } from '../../utils/plan'

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

function tipsToText(tips) {
  return Array.isArray(tips) ? tips.join('\n') : ''
}
function textToTips(text) {
  return text.split('\n').map(s => s.trim()).filter(Boolean)
}
// I piani scritti dal bot hanno `substitutions` come dict di regole strutturate:
// l'editor testuale non le tocca (si tiene la stringa solo per i piani webapp).
function subsToText(subs) {
  return typeof subs === 'string' ? subs : ''
}

async function triggerPdfDownload(id) {
  const { blob, filename } = await downloadDietPdf(id)
  saveBlob(blob, filename)
}

/* ------------------------------------------------------------------ */
/* Editor: crea / modifica un piano (griglia 7×5 + consigli + note)   */
/* ------------------------------------------------------------------ */
function DietEditor({ mode, diet, onCancel, onSaved, onToast }) {
  const [name, setName] = useState(diet?.name || '')
  const [plan, setPlan] = useState(() => (diet ? planFromApi(diet.weekly_plan) : emptyPlan()))
  const [tipsText, setTipsText] = useState(tipsToText(diet?.tips))
  const [subsText, setSubsText] = useState(subsToText(diet?.substitutions))
  const subsIsStructured = diet != null && typeof diet.substitutions === 'object' && diet.substitutions !== null

  const [pdfFile, setPdfFile] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)

  const cells = countCells(plan)

  function setCell(day, meal, value) {
    setPlan(p => ({ ...p, [day]: { ...p[day], [meal]: value } }))
  }

  async function handleImport(file) {
    if (!file) return
    if (file.type && file.type !== 'application/pdf') { onToast('Serve un file PDF'); return }
    setParsing(true)
    setWarnings([])
    try {
      const parsed = await parseDietPdf(file)
      setPdfFile(file)
      setPlan(planFromApi(parsed.weekly_plan))
      if (Array.isArray(parsed.tips) && parsed.tips.length) setTipsText(parsed.tips.join('\n'))
      setWarnings(parsed.warnings || [])
      if (!name.trim()) setName(file.name.replace(/\.pdf$/i, ''))
      onToast('PDF importato: rivedi la griglia')
    } catch (err) {
      const msg = err.status === 422 && err.detail?.detail ? err.detail.detail : 'PDF non elaborabile'
      onToast(msg)
      setPdfFile(null)
    } finally {
      setParsing(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) { onToast('Dai un nome al piano'); return }
    setSaving(true)
    try {
      const payload = { name: name.trim(), weekly_plan: planToApi(plan), tips: textToTips(tipsText) }
      if (!subsIsStructured) payload.substitutions = subsText.trim()

      const saved = mode === 'create'
        ? await createDiet(payload)
        : await updateDiet(diet.id, payload)

      if (pdfFile) {
        try {
          await uploadDietPdf(saved.id, pdfFile)
        } catch {
          onToast('Piano salvato, ma il PDF non è stato allegato')
          onSaved()
          return
        }
      }
      onToast(mode === 'create' ? 'Piano creato' : 'Piano aggiornato')
      onSaved()
    } catch (err) {
      onToast('Errore nel salvataggio' + (err.detail?.detail ? `: ${err.detail.detail}` : ''))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card mb-24">
      <div className="card__header">
        <h2 className="card__title">{mode === 'create' ? 'Nuovo piano dietetico' : `Modifica — ${diet.name}`}</h2>
        <button className="btn btn--ghost btn--sm" onClick={onCancel}>Chiudi</button>
      </div>

      <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 20 }}>
        <div className="form-grid">
          <div className="field field--full">
            <label htmlFor="planName">Nome del piano</label>
            <input
              className="input"
              id="planName"
              placeholder="es. Mediterranea 1800 kcal"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        </div>

        <label
          className={`upload${dragOver ? ' drag' : ''}`}
          htmlFor="planPdf"
          onDragEnter={e => { e.preventDefault(); setDragOver(true) }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleImport(e.dataTransfer.files[0]) }}
        >
          <input
            id="planPdf"
            type="file"
            accept="application/pdf"
            hidden
            onChange={e => handleImport(e.target.files[0])}
          />
          <div className="upload__title">
            {parsing
              ? 'Lettura del PDF…'
              : pdfFile
                ? `${pdfFile.name} — importato`
                : <>Importa da PDF: <span style={{ color: 'var(--brand)', textDecoration: 'underline', textUnderlineOffset: 2 }}>sfoglia</span> o trascina qui</>}
          </div>
          <div className="upload__hint">
            Compila la griglia leggendo la tabella del PDF. Il PDF viene allegato al piano; puoi comunque correggere le celle a mano. Solo .pdf · max 10 MB
          </div>
        </label>

        {warnings.length > 0 && (
          <div className="plan-warn">
            <strong>Controlla il risultato del parsing:</strong>
            <ul>
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        <div className="field">
          <label>Piano settimanale <span className="muted">· {cells}/35 celle compilate</span></label>
          <div className="plan-grid-scroll">
            <table className="plan-edit-table">
              <thead>
                <tr>
                  <th className="plan-table__corner" />
                  {DAYS.map(day => <th key={day} scope="col">{dayLabel(day)}</th>)}
                </tr>
              </thead>
              <tbody>
                {MEALS.map(meal => (
                  <tr key={meal}>
                    <th scope="row">{mealLabel(meal)}</th>
                    {DAYS.map(day => (
                      <td key={day}>
                        <textarea
                          value={plan[day][meal]}
                          onChange={e => setCell(day, meal, e.target.value)}
                          placeholder="—"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="field">
          <label htmlFor="planTips">Consigli alimentari <span className="muted">· uno per riga</span></label>
          <textarea
            className="textarea"
            id="planTips"
            rows={5}
            value={tipsText}
            onChange={e => setTipsText(e.target.value)}
            placeholder={'Bevi 1,5-2 litri di acqua al giorno\nPrivilegia frutta e verdura di stagione'}
          />
        </div>

        <div className="field">
          <label htmlFor="planSubs">Sostituzioni</label>
          {subsIsStructured ? (
            <p className="muted" style={{ fontSize: 12.5 }}>
              Questo piano usa le regole di sostituzione strutturate del bot: non sono modificabili da qui e restano invariate.
            </p>
          ) : (
            <textarea
              className="textarea"
              id="planSubs"
              rows={4}
              value={subsText}
              onChange={e => setSubsText(e.target.value)}
              placeholder="Testo libero: es. la pasta può essere sostituita con riso o farro a parità di grammatura…"
            />
          )}
        </div>
      </div>

      <div className="modal__footer" style={{ borderTop: '1px solid var(--line-soft)' }}>
        <button className="btn btn--ghost" onClick={onCancel}>Annulla</button>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving || parsing}>
          {saving ? 'Salvataggio…' : mode === 'create' ? 'Crea piano' : 'Salva modifiche'}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
export default function DietePage() {
  const [diets, setDiets] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const showLoading = useMinDuration(loading)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState(null)        // { mode, diet }
  const [previewDiet, setPreviewDiet] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [assignQuery, setAssignQuery] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [assigning, setAssigning] = useState(false)
  const [toast, setToast] = useState('')

  function loadData() {
    return Promise.all([getDiets(), getPatients()])
      .then(([d, p]) => { setDiets(d || []); setPatients(p || []) })
      .catch(e => setError(e.message))
  }

  useEffect(() => { loadData().finally(() => setLoading(false)) }, [])

  // L'editor è alto: aprendolo/chiudendolo si riporta la vista in cima, altrimenti
  // si resta a metà pagina su un'area vuota.
  useEffect(() => { window.scrollTo({ top: 0 }) }, [editor])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  const patientCountByDiet = useMemo(() => {
    const m = {}
    patients.forEach(p => {
      if (p.active_diet_plan_id) m[p.active_diet_plan_id] = (m[p.active_diet_plan_id] || 0) + 1
    })
    return m
  }, [patients])

  const filtered = useMemo(() => {
    let list = [...diets].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
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

  async function handleEditorSaved() {
    setEditor(null)
    await loadData()
  }

  async function handleDeleteConfirm() {
    setDeleting(true)
    try {
      await deleteDiet(deleteTarget.id)
      setDeleteTarget(null)
      showToast('Piano eliminato')
      await loadData()
    } catch {
      showToast('Errore durante l\'eliminazione')
    } finally {
      setDeleting(false)
    }
  }

  async function handleAssignConfirm() {
    if (!selected.size) { showToast('Seleziona almeno un paziente'); return }
    setAssigning(true)
    try {
      await Promise.all([...selected].map(pid => assignDietToPatient(pid, assignTarget.id)))
      setPatients(prev => prev.map(p => (selected.has(p.id) ? { ...p, active_diet_plan_id: assignTarget.id } : p)))
      const count = selected.size
      setSelected(new Set())
      setAssignTarget(null)
      showToast(`Piano assegnato a ${count} pazient${count === 1 ? 'e' : 'i'}`)
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

  async function handleDownload(id) {
    try {
      await triggerPdfDownload(id)
    } catch {
      showToast('Impossibile scaricare il PDF')
    }
  }

  if (showLoading) return <LoadingScreen label="Caricamento piani dietetici…" />
  if (error) return <div className="error-screen">Errore: {error}</div>

  return (
    <>
      <main className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Diete</h1>
            <p className="page-subtitle">Piani dietetici — creali, allegane il PDF, assegnali ai pazienti.</p>
          </div>
          {!editor && (
            <div className="page-actions">
              <button
                className="btn btn--primary"
                onClick={() => { setEditor({ mode: 'create', diet: null }); setPreviewDiet(null) }}
              >
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Nuovo piano
              </button>
            </div>
          )}
        </header>

        {editor && (
          <DietEditor
            mode={editor.mode}
            diet={editor.diet}
            onCancel={() => setEditor(null)}
            onSaved={handleEditorSaved}
            onToast={showToast}
          />
        )}

        {!editor && (
          <div className="table-wrap">
            <div className="table-toolbar">
              <div className="table-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="text" placeholder="Cerca piano…" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              <span className="table-count">{filtered.length} {filtered.length === 1 ? 'piano' : 'piani'}</span>
            </div>

            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: '38%' }}>Nome del piano</th>
                  <th>Pazienti assegnati</th>
                  <th>Creato il</th>
                  <th>PDF</th>
                  <th className="col-actions">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-4)' }}>
                      {query ? 'Nessun piano corrisponde alla ricerca.' : 'Nessun piano. Crea il primo!'}
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
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                            </svg>
                          </span>
                          <span>
                            <div className="cell-name__primary">{d.name}</div>
                            <div className="cell-name__sub">{countCells(planFromApi(d.weekly_plan))}/35 pasti</div>
                          </span>
                        </div>
                      </td>
                      <td>
                        {count > 0
                          ? <span className="tag" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', borderColor: 'var(--brand-100)' }}>{count} pazient{count === 1 ? 'e' : 'i'}</span>
                          : <span className="cell-muted">— nessuno —</span>}
                      </td>
                      <td className="cell-muted cell-mono">{formatDate(d.created_at)}</td>
                      <td>
                        {d.has_pdf
                          ? <span className="tag">PDF</span>
                          : <span className="cell-muted">—</span>}
                      </td>
                      <td className="col-actions">
                        <button className="btn btn--ghost btn--sm" onClick={() => setPreviewDiet(d)}>Vedi</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => { setEditor({ mode: 'edit', diet: d }); setPreviewDiet(null) }}>Modifica</button>
                        <button className="btn btn--secondary btn--sm" onClick={() => { setAssignTarget(d); setSelected(new Set()); setAssignQuery('') }}>Assegna</button>
                        <button className="btn btn--danger-ghost btn--sm" onClick={() => setDeleteTarget(d)}>Elimina</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Anteprima piano (sola lettura) */}
      {previewDiet && (
        <div className="modal-backdrop" onClick={() => setPreviewDiet(null)}>
          <div className="modal modal--wide" role="dialog" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{previewDiet.name}</h2>
              <p className="modal__sub">Creato il {formatDate(previewDiet.created_at)}{previewDiet.has_pdf ? ' · PDF allegato' : ''}</p>
            </div>
            <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <WeeklyPlanGrid plan={previewDiet.weekly_plan} />

              {Array.isArray(previewDiet.tips) && previewDiet.tips.length > 0 && (
                <div>
                  <div className="section-subhead">Consigli alimentari</div>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                    {previewDiet.tips.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <div className="section-subhead">Sostituzioni</div>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {typeof previewDiet.substitutions === 'string'
                    ? (previewDiet.substitutions || <span className="muted">Nessuna sostituzione indicata.</span>)
                    : <span className="muted">Regole strutturate definite dal bot (dettaglio non ancora visualizzabile).</span>}
                </p>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setPreviewDiet(null)}>Chiudi</button>
              {previewDiet.has_pdf && (
                <button className="btn btn--secondary" onClick={() => handleDownload(previewDiet.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Scarica PDF
                </button>
              )}
              <button className="btn btn--primary" onClick={() => { setEditor({ mode: 'edit', diet: previewDiet }); setPreviewDiet(null) }}>Modifica</button>
            </div>
          </div>
        </div>
      )}

      {/* Conferma eliminazione */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Eliminare il piano?</h2>
              <p className="modal__sub">{deleteTarget.name}</p>
            </div>
            <div className="modal__body">
              <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                Il piano e il suo PDF verranno rimossi definitivamente.
                {(patientCountByDiet[deleteTarget.id] || 0) > 0 && (
                  <> È attualmente assegnato a <strong>{patientCountByDiet[deleteTarget.id]}</strong> pazient{patientCountByDiet[deleteTarget.id] === 1 ? 'e' : 'i'}: {patientCountByDiet[deleteTarget.id] === 1 ? 'resterà' : 'resteranno'} senza dieta.</>
                )}
              </p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setDeleteTarget(null)}>Annulla</button>
              <button className="btn btn--danger" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? 'Eliminazione…' : 'Elimina piano'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assegna piano */}
      {assignTarget && (
        <div className="modal-backdrop" onClick={() => setAssignTarget(null)}>
          <div className="modal modal--assign" role="dialog" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Assegna piano dietetico</h2>
              <p className="modal__sub">Piano selezionato: {assignTarget.name}</p>
            </div>
            <div className="modal__body">
              <div className="table-search" style={{ width: '100%', minWidth: 0, marginBottom: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="text" placeholder="Cerca paziente…" value={assignQuery} onChange={e => setAssignQuery(e.target.value)} />
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
                {assignFiltered.map(p => {
                  const cfg = STATUS_CONFIG[deriveStatus(p)]
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
              <button className="btn btn--ghost" onClick={() => setAssignTarget(null)}>Annulla</button>
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
