// Metriche dei grafici che la nutrizionista può ordinare e nascondere (punto 25).
// Le chiavi devono coincidere con METRIC_KEYS in olivia-backend/src/routers/auth.py.
export const METRICS = [
  { key: 'weight', label: 'Peso', onlyPatient: true },
  { key: 'adherence', label: 'Aderenza ai pasti' },
  { key: 'satisfaction', label: 'Gradimento pasti' },
  { key: 'sleep', label: 'Qualità del sonno' },
  { key: 'hunger', label: 'Livello di fame' },
  { key: 'hydration', label: 'Idratazione' },
  { key: 'messages', label: 'Messaggi scambiati col bot' },
  { key: 'mood', label: 'Umore' },
]

export const METRIC_LABELS = Object.fromEntries(METRICS.map(m => [m.key, m.label]))

// Ordine che ogni schermata aveva prima del punto 25: si usa finché la
// nutrizionista non salva una preferenza sua.
export const HOME_DEFAULT_ORDER = ['adherence', 'hydration', 'satisfaction', 'mood', 'sleep', 'messages', 'hunger', 'weight']
export const PATIENT_DEFAULT_ORDER = ['weight', 'adherence', 'sleep', 'hunger', 'satisfaction', 'hydration', 'messages', 'mood']

// Preferenza salvata (o null) -> lista completa [{ key, visible }] nell'ordine da mostrare.
export function resolveMetrics(saved, defaultOrder) {
  if (!saved?.length) return defaultOrder.map(key => ({ key, visible: true }))
  const known = saved.filter(m => METRIC_LABELS[m.key])
  const missing = defaultOrder.filter(key => !known.some(m => m.key === key))
  return [...known, ...missing.map(key => ({ key, visible: true }))]
}
