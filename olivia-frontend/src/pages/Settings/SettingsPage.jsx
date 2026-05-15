import { useState } from 'react'
import { Icon, Avatar, Field } from '../../components/ui'

function SettingCard({ title, sub, children }) {
  return (
    <div className="card card--pad setting-card">
      <div className="setting-card__head">
        <h3 className="sec-title sec-title--sm">{title}</h3>
        {sub && <div className="muted small">{sub}</div>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState('clinica')

  const tabs = [
    { id: 'clinica',    label: 'Clinica' },
    { id: 'bot',        label: 'Integrazione bot' },
    { id: 'db',         label: 'MongoDB' },
    { id: 'account',    label: 'Account & team' },
  ]

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <div className="breadcrumbs mono">Clinica &nbsp;/&nbsp; Impostazioni</div>
          <h1 className="page-title">Impostazioni</h1>
          <div className="muted">Gestione clinica, integrazione bot Telegram, connessione MongoDB, team.</div>
        </div>
      </div>

      <div className="settings">
        <aside className="settings__nav">
          {tabs.map(t => (
            <button key={t.id} className={`settings__navbtn${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </aside>

        <div className="settings__body">
          {tab === 'clinica' && (
            <>
              <SettingCard title="Informazioni clinica" sub="Nome, indirizzo e intestazione per stampe.">
                <div className="grid2">
                  <Field label="Nome clinica"><input defaultValue="Studio Nutrizione Dott.ssa Rossi" /></Field>
                  <Field label="P. IVA"><input defaultValue="IT 01234567890" /></Field>
                  <Field label="Indirizzo" span={2}><input defaultValue="Via della Salute 12, 00198 Roma" /></Field>
                  <Field label="Telefono"><input defaultValue="+39 06 1234 5678" /></Field>
                  <Field label="Email"><input defaultValue="info@studio-rossi.it" /></Field>
                </div>
              </SettingCard>
              <SettingCard title="Stampe e intestazione" sub="Ciò che il paziente vede su QR e piano stampato.">
                <Field label="Firma digitale sulle stampe">
                  <label className="toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle__track"><span className="toggle__thumb" /></span>
                    <span className="toggle__label">Attiva</span>
                  </label>
                </Field>
                <Field label="Nota in fondo al foglio">
                  <textarea rows="2" defaultValue="Le informazioni contenute sono a uso esclusivo del paziente indicato." />
                </Field>
              </SettingCard>
            </>
          )}

          {tab === 'bot' && (
            <>
              <SettingCard title="Bot Telegram Olivia" sub="Connessione al bot che parla con i pazienti.">
                <div className="conn-row">
                  <div className="conn-row__icon" style={{ background: '#E7EEF6', color: '#1B4F8A' }}>
                    <Icon name="bot" size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="conn-row__name">@OliviaDietBot</div>
                    <div className="conn-row__meta mono muted">Webhook: https://api.olivia.md/webhook · latenza 120ms</div>
                  </div>
                  <span className="tag tag--green"><span className="dot" style={{ background: '#2E7D5E' }} /> connesso</span>
                </div>
                <div className="grid2" style={{ marginTop: 14 }}>
                  <Field label="Token bot"><input defaultValue="••••••••••••••••5f3e" type="password" /></Field>
                  <Field label="Lingua predefinita">
                    <select defaultValue="Italiano"><option>Italiano</option><option>English</option></select>
                  </Field>
                </div>
              </SettingCard>
              <SettingCard title="Automazioni bot" sub="Messaggi inviati automaticamente ai pazienti.">
                <div className="automations">
                  {[
                    ['Reminder pasto se non riferito', 'ore 14:30 e 21:30', true],
                    ['Pesata settimanale', 'lunedì ore 08:00', true],
                    ['Check idratazione', 'ogni 4 ore tra 09:00 e 19:00', false],
                    ['Richiesta umore serale', 'ore 22:00', true],
                  ].map(([name, when, on], i) => (
                    <div key={i} className="automation">
                      <div>
                        <div className="automation__name">{name}</div>
                        <div className="mono muted small">{when}</div>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" defaultChecked={on} />
                        <span className="toggle__track"><span className="toggle__thumb" /></span>
                      </label>
                    </div>
                  ))}
                </div>
              </SettingCard>
            </>
          )}

          {tab === 'db' && (
            <>
              <SettingCard title="Connessione MongoDB" sub="Il bot e il webapp leggono/scrivono nello stesso cluster.">
                <div className="conn-row">
                  <div className="conn-row__icon" style={{ background: '#E8F1EC', color: '#2E7D5E' }}>
                    <Icon name="database" size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="conn-row__name">olivia · Docker locale</div>
                    <div className="conn-row__meta mono muted">mongodb://olivia:olivia@localhost:27017/olivia</div>
                  </div>
                  <span className="tag tag--green"><span className="dot" style={{ background: '#2E7D5E' }} /> in salute</span>
                </div>
                <div className="grid3" style={{ marginTop: 14 }}>
                  <Field label="Collezione pazienti"><input defaultValue="users" /></Field>
                  <Field label="Collezione diete"><input defaultValue="diet-plans" /></Field>
                  <Field label="Collezione log"><input defaultValue="patient_logs" /></Field>
                </div>
              </SettingCard>
              <SettingCard title="Backup automatici" sub="Snapshot giornaliero con ritenzione 30 giorni.">
                <div className="backup-list">
                  {[
                    ['2026-04-18 03:00', '142 MB', 'completato'],
                    ['2026-04-17 03:00', '141 MB', 'completato'],
                    ['2026-04-16 03:00', '140 MB', 'completato'],
                  ].map(([d, s, st], i) => (
                    <div key={i} className="backup-row">
                      <span className="mono">{d}</span>
                      <span className="muted">{s}</span>
                      <span className="tag tag--green tag--sm"><Icon name="check" size={10} /> {st}</span>
                      <button className="btn btn--ghost btn--sm"><Icon name="download" size={12} /> Scarica</button>
                    </div>
                  ))}
                </div>
              </SettingCard>
            </>
          )}

          {tab === 'account' && (
            <>
              <SettingCard title="Team" sub="Utenti con accesso alla dashboard.">
                <div className="team-list">
                  {[
                    ['Dott.ssa Paola Rossi', 'Nutrizionista · admin', 'DR', 1],
                    ['Dott. Luca Marini', 'Nutrizionista', 'LM', 0],
                    ['Silvia Greco', 'Segreteria · solo lettura', 'SG', 2],
                  ].map(([n, r, ini, t], i) => (
                    <div key={i} className="team-row">
                      <Avatar initials={ini} size={36} tone={t} />
                      <div style={{ flex: 1 }}>
                        <div className="team-row__name">{n}</div>
                        <div className="muted small">{r}</div>
                      </div>
                      <button className="btn btn--ghost btn--sm">Gestisci</button>
                    </div>
                  ))}
                </div>
                <button className="btn btn--primary btn--sm" style={{ marginTop: 12 }}>
                  <Icon name="plus" size={12} /> Invita collega
                </button>
              </SettingCard>
              <SettingCard title="Preferenze">
                <div className="grid2">
                  <Field label="Fuso orario">
                    <select defaultValue="Europe/Rome"><option>Europe/Rome</option><option>Europe/London</option></select>
                  </Field>
                  <Field label="Formato data">
                    <select defaultValue="DD/MM/YYYY"><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option></select>
                  </Field>
                </div>
              </SettingCard>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
