import { useCallback, useEffect, useState } from 'react'
import { readSession } from '../api/auth'
import { getPreferences, savePreferences } from '../api/preferences'
import { resolveMetrics } from '../utils/metrics'

// Tenuta in memoria fra una pagina e l'altra (Home e scheda paziente non la
// richiedono a ogni cambio di pagina), ma legata alla sessione: dopo un nuovo
// login si rilegge dal backend.
const cache = { token: null, metrics: undefined }

function cachedFor(token) {
  return cache.token === token ? cache.metrics : undefined
}

// Metriche nell'ordine scelto dall'account (o in quello predefinito della schermata).
export default function useMetricPrefs(defaultOrder) {
  const token = readSession()?.token ?? null
  const [saved, setSaved] = useState(() => cachedFor(token))

  useEffect(() => {
    if (cachedFor(token) !== undefined) return
    getPreferences()
      .then(res => res?.metrics ?? null)
      .catch(() => null)
      .then(metrics => {
        cache.token = token
        cache.metrics = metrics
        setSaved(metrics)
      })
  }, [token])

  const save = useCallback(async metrics => {
    const res = await savePreferences(metrics)
    cache.token = token
    cache.metrics = res?.metrics ?? null
    setSaved(cache.metrics)
  }, [token])

  return {
    ready: saved !== undefined,
    metrics: resolveMetrics(saved, defaultOrder),
    save,
  }
}
