import { shiftMonths } from './format.js'
// Dívida Bruta do Governo Geral (Banco Central): valida o arquivo coletado e monta as leituras da tela.
export const DIVIDA_METRICS = [
  { id: 'divida-pib', field: 'pib', label: 'DBGG · % do PIB', unit: '% do PIB', decimals: 2, pct: true },
  { id: 'divida-brl', field: 'brl', label: 'DBGG · saldo em R$ bilhões', unit: 'R$ bilhões', decimals: 0, scale: 1e-3 },
]

export function normalizeDivida(data) {
  const s = data?.series
  if (s?.id !== 'divida-bruta' || !Array.isArray(s.points) || typeof s.checkedAt !== 'string') throw new Error('Arquivo da dívida bruta inválido')
  const points = s.points.filter((p) => /^\d{4}-(0[1-9]|1[0-2])$/.test(p?.period)).sort((a, b) => a.period.localeCompare(b.period))
  if (points.length !== s.points.length || new Set(points.map((p) => p.period)).size !== points.length) throw new Error('Histórico da dívida bruta inválido')
  return { ...s, points }
}

// Série { period, value } de uma leitura; mês sem a leitura fica de fora, nunca vira zero.
export const dividaSeries = (series, metric) => series.points.filter((p) => Number.isFinite(p[metric.field])).map((p) => ({ period: p.period, value: p[metric.field] * (metric.scale ?? 1) }))

// Linhas da tabela: último valor, mês anterior, diferença, mesmo mês do ano anterior e máxima/mínima da série.
export function dividaRows(series) {
  return DIVIDA_METRICS.map((metric) => {
    const points = dividaSeries(series, metric)
    const last = points.at(-1) ?? null
    const at = (n) => (last ? points.find((p) => p.period === shiftMonths(`${last.period}-15`, n).slice(0, 7)) ?? null : null)
    const prev = at(-1), yearAgo = at(-12)
    const peak = points.reduce((m, p) => (!m || p.value > m.value ? p : m), null)
    return { metric, points, last, prev, yearAgo, peak, delta: last && prev ? last.value - prev.value : null, deltaYear: last && yearAgo ? last.value - yearAgo.value : null }
  })
}
