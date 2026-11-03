// Acessos ao app (Umami Cloud, link de compartilhamento público e só de leitura). Lê com o token do link de compartilhamento:
// visitantes ativos agora e visitantes/visualizações por dia. Tolerante às duas formas de resposta do Umami (v2 e v3).
export const UMAMI_API = 'https://cloud.umami.is/api'
export const DIAS = 30
const num = (v) => (typeof v === 'number' ? v : typeof v?.value === 'number' ? v.value : Number.isFinite(Number(v)) ? Number(v) : null)

export function parseAtivos(j) {
  if (Array.isArray(j)) return num(j[0]?.x ?? j[0]?.visitors)
  return num(j?.visitors ?? j?.x ?? j?.active)
}
// { pageviews: [{ x: '2026-11-03 00:00:00', y: 5 }], sessions: [...] } → [{ d: '2026-11-03', visitantes, views }]
export function parseDias(j) {
  const por = new Map()
  const add = (arr, campo) => { for (const p of Array.isArray(arr) ? arr : []) { const d = String(p?.x ?? p?.t ?? '').slice(0, 10); const v = num(p?.y); if (/^\d{4}-\d{2}-\d{2}$/.test(d) && v != null) por.set(d, { d, visitantes: 0, views: 0, ...por.get(d), [campo]: v }) } }
  add(j?.pageviews, 'views')
  add(j?.sessions ?? j?.visitors, 'visitantes')
  return [...por.values()].sort((a, b) => (a.d < b.d ? -1 : 1))
}
export function acessosFile({ online, dias, now, erro = null, anterior = null }) {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(now))
  const soma = (k, desde) => dias.filter((x) => x.d >= desde).reduce((s, x) => s + (x[k] ?? 0), 0)
  const d7 = new Date(Date.parse(hoje + 'T12:00:00Z') - 6 * 864e5).toISOString().slice(0, 10)
  if (erro && anterior) return { ...anterior, stale: true, erro }
  return { generatedAt: now, online, hoje: dias.find((x) => x.d === hoje) ?? { d: hoje, visitantes: 0, views: 0 }, semana: { visitantes: soma('visitantes', d7), views: soma('views', d7) }, dias, stale: !!erro, erro }
}
