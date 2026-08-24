import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import OliviaLogo from '../../components/OliviaLogo'
import { UnauthorizedError } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'

const POINTS = [
  {
    title: 'I dati arrivano da soli',
    text: 'Pasti, peso, idratazione e umore raccolti ogni giorno dal bot Telegram.',
    icon: (
      <>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </>
    ),
  },
  {
    title: 'Le diete restano allineate',
    text: 'Carichi il piano una volta: il bot lo segue col paziente, giorno per giorno.',
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </>
    ),
  },
  {
    title: "L'aderenza si vede subito",
    text: 'Storico dei log e report giornalieri per capire dove intervenire.',
    icon: (
      <>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </>
    ),
  },
]

export default function LoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Inserisci email e password.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await signIn({ email: email.trim(), password, remember })
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof UnauthorizedError
          ? 'Email o password non corretti.'
          : 'Accesso non riuscito. Riprova tra qualche istante.'
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="login">
      <aside className="login__brand">
        <OliviaLogo height={44} />

        <div className="login__brand-body">
          <h2 className="login__claim">La dieta continua<br />anche fuori dallo studio.</h2>
          <ul className="login__points">
            {POINTS.map(point => (
              <li key={point.title} className="login__point">
                <span className="login__point-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {point.icon}
                  </svg>
                </span>
                <span>
                  <span className="login__point-title">{point.title}</span>
                  <span className="login__point-text">{point.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="login__brand-foot">
          Tesi di laurea in Informatica · ITPS — Università degli Studi di Bari
        </p>
      </aside>

      <main className="login__panel">
        <div className="login-card">
          <div className="page-eyebrow">Area riservata</div>
          <h1 className="login-card__title">Accedi allo studio</h1>
          <p className="login-card__sub">Usa le credenziali del tuo account clinico.</p>

          {error && <div className="login-error" role="alert">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="input"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="nome@studio.it"
                value={email}
                onChange={e => setEmail(e.target.value)}
                aria-invalid={error ? 'true' : undefined}
              />
            </div>

            <div className="field">
              <label htmlFor="login-password">Password</label>
              <div className="input-wrap">
                <input
                  id="login-password"
                  className="input input--with-toggle"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  aria-invalid={error ? 'true' : undefined}
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showPassword ? 'Nascondi' : 'Mostra'}
                </button>
              </div>
            </div>

            <label className="check">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
              <span>Resta connesso su questo dispositivo</span>
            </label>

            <button className="btn btn--primary btn--lg login__submit" type="submit" disabled={submitting}>
              {submitting ? 'Accesso in corso…' : 'Accedi'}
            </button>
          </form>

          <p className="login-card__foot">
            Gli account vengono creati dall'amministratore dello studio.
          </p>
        </div>
      </main>
    </div>
  )
}
