import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { clearSession, fetchMe, login as apiLogin, readSession } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession()?.user ?? null)
  const [checking, setChecking] = useState(() => !!readSession())

  useEffect(() => {
    if (!readSession()) return
    let cancelled = false
    fetchMe()
      .then(me => { if (!cancelled && me) setUser(me) })
      .catch(() => {
        if (cancelled) return
        clearSession()
        setUser(null)
      })
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const handler = () => setUser(null)
    window.addEventListener('olivia:unauthorized', handler)
    return () => window.removeEventListener('olivia:unauthorized', handler)
  }, [])

  const signIn = useCallback(async credentials => {
    const me = await apiLogin(credentials)
    setUser(me)
    return me
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, checking, signIn, signOut }),
    [user, checking, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth va usato dentro <AuthProvider>')
  return ctx
}
