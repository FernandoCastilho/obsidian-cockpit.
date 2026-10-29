// Apresentação da Taxa Fixa do BNDES (TFB): arquivo bndes.json (série diária em % a.a. por prazo e dias até a liberação dos recursos).
export const PRAZOS = [36, 60, 84, 120]
export const LIBERACOES = [30, 90]
export const PRAZO_LABEL = { 36: 'até 36 meses', 60: '36 a 60 meses', 84: '60 a 84 meses', 120: '84 a 120 meses' }
export const TFB_DEFINICAO = 'Taxa Fixa do BNDES. Custo financeiro prefixado, que já incorpora a sobretaxa de referência, por faixa de prazo do financiamento e por prazo até a liberação dos recursos (30 ou 90 dias). A taxa final do cliente ainda soma os spreads do BNDES e do agente financeiro.'
export const keyOf = (prazo, liberacao) => `TFB_${prazo}_${liberacao}`

const nf = (v, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const t12 = (iso) => Date.parse(`${iso}T12:00:00Z`)
const shiftMonths = (iso, n) => { const d = new Date(t12(iso)); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10) }
export const dmy = (iso) => iso.split('-').reverse().join('/')

// Última observação em ou antes de `limit` (AAAA-MM-DD); null se a série começa depois.
function atOrBefore(points, limit) {
  let found = null
  for (const p of points) { if (p[0] <= limit) found = p; else break }
  return found
}
// Variação em pontos percentuais, com seta (▲ subiu, ▼ caiu, = igual); null quando falta a referência.
export function change(value, ref) {
  if (!Number.isFinite(value) || !ref) return null
  const diff = value - ref[1]
  const flat = Math.abs(diff) < 0.005
  return { diff, ref: ref[0], dir: flat ? 'same' : diff > 0 ? 'up' : 'down', text: flat ? '= 0,00 p.p.' : `${diff > 0 ? '▲ +' : '▼ −'}${nf(Math.abs(diff))} p.p.` }
}

// Pontos [[AAAA-MM-DD, valor]] de uma série, ou [] quando ela não existe.
export const pointsOf = (data, key) => (Array.isArray(data?.series?.[key]?.points) ? data.series[key].points : [])

// Linhas da tabela: prazo × liberação, com a cotação mais recente e as variações no dia, em um mês e em um ano.
export function bndesRows(data) {
  return PRAZOS.flatMap((prazo) => LIBERACOES.map((liberacao) => {
    const key = keyOf(prazo, liberacao), points = pointsOf(data, key), base = { key, prazo, liberacao, label: PRAZO_LABEL[prazo] }
    if (!points.length) return { ...base, missing: true }
    const [date, value] = points.at(-1)
    return { ...base, date, value, text: `${nf(value)}% a.a.`, day: change(value, points.length > 1 ? points.at(-2) : null), month: change(value, atOrBefore(points, shiftMonths(date, -1))), year: change(value, atOrBefore(points, shiftMonths(date, -12))), stale: data?.stale?.[key] ?? null }
  }))
}
