import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPatient } from '../../api/patients'
import SuccessOverlay from '../../components/SuccessOverlay'
import { splitList } from '../../utils/text'

function ageFromDob(dob) {
  if (!dob) return null
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--
  return age
}

function ChevronDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

const ANAGRAFICA_KEYS = ['firstName', 'lastName', 'sex', 'dob', 'city']
const CLINICI_KEYS = ['weight', 'height', 'goal']

export default function NuovoPaziente() {
  const navigate = useNavigate()
  const [open, setOpen] = useState({ anagrafica: true, clinici: true, abitudini: false })
  const [sex, setSex] = useState('')
  const [activity, setActivity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [invalidFields, setInvalidFields] = useState({})
  const [createdName, setCreatedName] = useState('')
  const [form, setForm] = useState({
    firstName: '', lastName: '', dob: '', city: '',
    weight: '', height: '', goal: '', allergies: '',
    timeWake: '', timeBreakfast: '', timeLunch: '', timeDinner: '',
    activityWhat: '', activityFreq: '', clinicalNotes: '',
  })

  function toggle(section) {
    setOpen(o => ({ ...o, [section]: !o[section] }))
  }

  function setF(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    if (val && invalidFields[key]) setInvalidFields(v => ({ ...v, [key]: false }))
  }

  function pickSex(val) {
    setSex(val)
    if (invalidFields.sex) setInvalidFields(v => ({ ...v, sex: false }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const missing = {}
    if (!form.firstName) missing.firstName = true
    if (!form.lastName) missing.lastName = true
    if (!sex) missing.sex = true
    if (!form.dob) missing.dob = true
    if (!form.city) missing.city = true
    if (!form.weight) missing.weight = true
    if (!form.height) missing.height = true
    if (!form.goal) missing.goal = true

    if (Object.keys(missing).length) {
      const missingAnagrafica = ANAGRAFICA_KEYS.some(k => missing[k])
      const missingClinici = CLINICI_KEYS.some(k => missing[k])
      setInvalidFields(missing)
      setOpen(o => ({
        ...o,
        anagrafica: o.anagrafica || missingAnagrafica,
        clinici: o.clinici || missingClinici,
      }))
      setFormError(
        missingAnagrafica && missingClinici
          ? 'Mancano dei campi obbligatori nei dati anagrafici e clinici.'
          : missingAnagrafica
            ? 'Mancano dei campi obbligatori nei dati anagrafici.'
            : 'Mancano dei campi obbligatori nei dati clinici.'
      )
      return
    }

    setFormError('')
    setInvalidFields({})
    setSubmitting(true)
    try {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`
      await createPatient({
        full_name: fullName,
        gender: sex === 'F' ? 'Femmina' : sex === 'M' ? 'Maschio' : 'Non specificato',
        age: ageFromDob(form.dob),
        living_at: form.city,
        weight: parseFloat(form.weight),
        height: parseFloat(form.height),
        goal: form.goal,
        allergies: splitList(form.allergies),
        notes: form.clinicalNotes || null,
        wakes_up_at: form.timeWake || null,
        breakfast_at: form.timeBreakfast || null,
        lunch_at: form.timeLunch || null,
        dinner_at: form.timeDinner || null,
        physical_activity: activity === 'si' ? true : activity === 'no' ? false : null,
        physical_activity_which: activity === 'si' ? (form.activityWhat || null) : null,
        physical_activity_frequency: activity === 'si' ? (form.activityFreq || null) : null,
      })
      setCreatedName(fullName)
    } catch (err) {
      console.error('Creazione paziente fallita:', err.detail || err)
      setFormError('Non siamo riusciti a salvare la scheda. Controlla i dati e riprova.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <main className="page page--narrow">
        <button
          className="back-link"
          onClick={() => navigate('/pazienti')}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Tutti i pazienti
        </button>

        <header className="page-header" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="page-title">Nuovo paziente</h1>
            <p className="page-subtitle">Le sezioni 1 e 2 sono obbligatorie. Le abitudini possono essere compilate in un secondo momento.</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          {/* 1. Anagrafica */}
          <div className={`section${open.anagrafica ? ' open' : ''}`}>
            <header className="section__header" onClick={() => toggle('anagrafica')}>
              <span className="section__num">1</span>
              <div className="section__meta">
                <div className="section__title">Dati anagrafici</div>
                <div className="section__sub">Obbligatori · identità e residenza</div>
              </div>
              <span className="section__chev"><ChevronDown /></span>
            </header>
            {open.anagrafica && (
              <div className="section__body">
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="firstName">Nome<span className="req">*</span></label>
                    <input className={`input${invalidFields.firstName ? ' invalid' : ''}`} id="firstName" placeholder="es. Sofia" value={form.firstName} onChange={e => setF('firstName', e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="lastName">Cognome<span className="req">*</span></label>
                    <input className={`input${invalidFields.lastName ? ' invalid' : ''}`} id="lastName" placeholder="es. Bianchi" value={form.lastName} onChange={e => setF('lastName', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Sesso<span className="req">*</span></label>
                    <div className={`radio-row${invalidFields.sex ? ' invalid' : ''}`}>
                      {[['F', 'Femminile'], ['M', 'Maschile'], ['X', 'Non specificato']].map(([v, l]) => (
                        <label key={v} className={`radio-pill${sex === v ? ' active' : ''}`}>
                          <input type="radio" name="sex" value={v} checked={sex === v} onChange={() => pickSex(v)} />
                          {l}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="dob">Data di nascita<span className="req">*</span></label>
                    <input className={`input${invalidFields.dob ? ' invalid' : ''}`} id="dob" type="date" value={form.dob} onChange={e => setF('dob', e.target.value)} />
                  </div>
                  <div className="field field--full">
                    <label htmlFor="city">Città<span className="req">*</span></label>
                    <input className={`input${invalidFields.city ? ' invalid' : ''}`} id="city" placeholder="es. Milano" value={form.city} onChange={e => setF('city', e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Clinici */}
          <div className={`section${open.clinici ? ' open' : ''}`}>
            <header className="section__header" onClick={() => toggle('clinici')}>
              <span className="section__num">2</span>
              <div className="section__meta">
                <div className="section__title">Dati clinici</div>
                <div className="section__sub">Obbligatori · misure di partenza e obiettivo</div>
              </div>
              <span className="section__chev"><ChevronDown /></span>
            </header>
            {open.clinici && (
              <div className="section__body">
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="weight">Peso<span className="req">*</span></label>
                    <div className="input-wrap">
                      <input className={`input input--with-suffix${invalidFields.weight ? ' invalid' : ''}`} id="weight" type="number" min="30" max="250" step="0.1" placeholder="65.0" value={form.weight} onChange={e => setF('weight', e.target.value)} />
                      <span className="suffix">kg</span>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="height">Altezza<span className="req">*</span></label>
                    <div className="input-wrap">
                      <input className={`input input--with-suffix${invalidFields.height ? ' invalid' : ''}`} id="height" type="number" min="100" max="230" step="1" placeholder="170" value={form.height} onChange={e => setF('height', e.target.value)} />
                      <span className="suffix">cm</span>
                    </div>
                  </div>
                  <div className="field field--full">
                    <label htmlFor="goal">Obiettivo<span className="req">*</span></label>
                    <select className={`select${invalidFields.goal ? ' invalid' : ''}`} id="goal" value={form.goal} onChange={e => setF('goal', e.target.value)}>
                      <option value="" disabled>Seleziona un obiettivo…</option>
                      <option value="Perdita di peso">Perdita di peso</option>
                      <option value="Mantenimento">Mantenimento</option>
                      <option value="Aumento massa">Aumento massa</option>
                      <option value="Riduzione colesterolo">Riduzione colesterolo</option>
                      <option value="Regolarizzazione glicemia">Regolarizzazione glicemia</option>
                    </select>
                  </div>
                  <div className="field field--full">
                    <label htmlFor="allergies">Allergie / intolleranze</label>
                    <textarea className="textarea" id="allergies" placeholder={'es. lattosio, glutine, frutta a guscio… Scrivi "nessuna" se non rilevanti.'} value={form.allergies} onChange={e => setF('allergies', e.target.value)} />
                    <span className="field-help">Testo libero — il bot ne tiene conto nei suggerimenti.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Abitudini */}
          <div className={`section${open.abitudini ? ' open' : ''}`}>
            <header className="section__header" onClick={() => toggle('abitudini')}>
              <span className="section__num">3</span>
              <div className="section__meta">
                <div className="section__title">
                  Abitudini <span className="muted" style={{ fontWeight: 400 }}>— opzionale</span>
                </div>
                <div className="section__sub">Orari della giornata, attività fisica, note libere</div>
              </div>
              <span className="section__chev"><ChevronDown /></span>
            </header>
            {open.abitudini && (
              <div className="section__body">
                <div className="section-subhead">Orari della giornata</div>
                <div className="form-grid form-grid--3">
                  <div className="field">
                    <label htmlFor="timeWake">Sveglia</label>
                    <input className="input" id="timeWake" type="time" value={form.timeWake} onChange={e => setF('timeWake', e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="timeBreakfast">Colazione</label>
                    <input className="input" id="timeBreakfast" type="time" value={form.timeBreakfast} onChange={e => setF('timeBreakfast', e.target.value)} />
                  </div>
                  <div className="field" />
                  <div className="field">
                    <label htmlFor="timeLunch">Pranzo</label>
                    <input className="input" id="timeLunch" type="time" value={form.timeLunch} onChange={e => setF('timeLunch', e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="timeDinner">Cena</label>
                    <input className="input" id="timeDinner" type="time" value={form.timeDinner} onChange={e => setF('timeDinner', e.target.value)} />
                  </div>
                </div>

                <div className="section-subhead" style={{ marginTop: 24, marginBottom: 8 }}>Attività fisica</div>
                <div className="form-grid">
                  <div className="field field--full">
                    <div className="radio-row">
                      {[['no', 'No'], ['si', 'Sì']].map(([v, l]) => (
                        <label key={v} className={`radio-pill${activity === v ? ' active' : ''}`}>
                          <input type="radio" name="activity" value={v} checked={activity === v} onChange={() => setActivity(v)} />
                          {l}
                        </label>
                      ))}
                    </div>
                  </div>
                  {activity === 'si' && (
                    <>
                      <div className="field">
                        <label htmlFor="activityWhat">Quale attività</label>
                        <input className="input" id="activityWhat" placeholder="es. corsa, palestra, yoga…" value={form.activityWhat} onChange={e => setF('activityWhat', e.target.value)} />
                      </div>
                      <div className="field">
                        <label htmlFor="activityFreq">Frequenza</label>
                        <select className="select" id="activityFreq" value={form.activityFreq} onChange={e => setF('activityFreq', e.target.value)}>
                          <option value="" disabled>Seleziona…</option>
                          <option value="1">1 volta a settimana</option>
                          <option value="2-3">2–3 volte a settimana</option>
                          <option value="4-5">4–5 volte a settimana</option>
                          <option value="6+">6 o più volte a settimana</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <div className="form-grid" style={{ paddingTop: 20 }}>
                  <div className="field field--full">
                    <label htmlFor="clinicalNotes">Note cliniche libere</label>
                    <textarea className="textarea" id="clinicalNotes" placeholder="Patologie, terapie in corso, contesto familiare, qualsiasi cosa rilevante…" value={form.clinicalNotes} onChange={e => setF('clinicalNotes', e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {formError && (
            <div className="form-error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16.5" x2="12" y2="16.51" />
              </svg>
              <span>{formError}</span>
            </div>
          )}

          <div className="form-footer">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/pazienti')}>Annulla</button>
            <div className="form-footer-right">
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Creazione…' : 'Crea paziente'}
              </button>
            </div>
          </div>
        </form>
      </main>

      <SuccessOverlay
        show={!!createdName}
        title="Paziente creato"
        message={`Scheda di ${createdName} creata e pronta in elenco.`}
        onDone={() => navigate('/pazienti')}
      />
    </>
  )
}
