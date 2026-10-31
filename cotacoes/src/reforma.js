// Reforma tributária: leitura do arquivo coletado e agrupamento por dia (Brasília).
const TZ = 'America/Sao_Paulo'
export const dayOf = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: TZ })
const plain = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function normalizeReforma(data) {
  if (!data || data.topic !== 'reforma-tributaria' || !Array.isArray(data.items)) throw new Error('Arquivo de reforma tributária inválido')
  const items = data.items.filter((i) => i && typeof i.title === 'string' && i.title && /^https?:\/\//.test(i.link ?? '') && Number.isFinite(i.t)).sort((a, b) => b.t - a.t)
  return { generatedAt: data.generatedAt, stale: !!data.stale, error: data.error ?? null, windowDays: data.windowDays ?? 7, items }
}

// Dias com matéria, do mais recente ao mais antigo: { key, count, items, sources: [[veículo, n]...] }.
export function groupByDay(items) {
  const days = []
  for (const it of items) {
    const key = dayOf(it.t)
    if (days.at(-1)?.key !== key) days.push({ key, items: [] })
    days.at(-1).items.push(it)
  }
  return days.map((d) => {
    const counts = new Map()
    for (const it of d.items) counts.set(it.source, (counts.get(it.source) ?? 0) + 1)
    return { ...d, count: d.items.length, sources: [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) }
  })
}

// Busca por palavras (todas precisam aparecer no título ou no veículo), sem acento nem maiúscula.
export function searchItems(items, term) {
  const words = plain(term ?? '').split(/\s+/).filter(Boolean)
  return words.length ? items.filter((i) => { const t = plain(`${i.title} ${i.source}`); return words.every((w) => t.includes(w)) }) : items
}

// Arquivo de temas (setores e insumos): { temas: { id: { label, grupo, items } } } -> dados de um tema no mesmo formato da reforma tributária.
export function normalizeTemas(data) {
  if (!data || typeof data !== 'object' || !data.temas || typeof data.temas !== 'object') throw new Error('Arquivo de temas inválido')
  const out = {}
  for (const [id, t] of Object.entries(data.temas)) {
    if (!t || !Array.isArray(t.items)) continue
    out[id] = { label: t.label, grupo: t.grupo, generatedAt: data.generatedAt, stale: !!data.stale, windowDays: data.windowDays ?? 7, items: t.items.filter((i) => i && typeof i.title === 'string' && i.title && /^https?:\/\//.test(i.link ?? '') && Number.isFinite(i.t)).sort((a, b) => b.t - a.t) }
  }
  return out
}
