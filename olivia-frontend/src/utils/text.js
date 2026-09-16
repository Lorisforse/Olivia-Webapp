export function splitList(text) {
  if (!text) return null
  const items = text.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
  return items.length ? items : null
}
