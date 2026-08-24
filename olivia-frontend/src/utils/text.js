/**
 * Converte un campo di testo libero (es. textarea "Allergie") in una lista
 * di stringhe pulite, come richiesto dagli schemi backend (`list[str]`).
 * Divide su virgola o a capo, scarta gli elementi vuoti. Ritorna `null`
 * se non c'è nulla da inviare, per restare coerente con gli altri campi
 * opzionali del form.
 */
export function splitList(text) {
  if (!text) return null
  const items = text.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
  return items.length ? items : null
}
