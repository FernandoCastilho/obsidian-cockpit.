// IPCA (IBGE, SIDRA): valida o arquivo coletado e monta as quatro leituras que a tela mostra.
export const IPCA_METRICS = [
  { id: 'ipca-mom', field: 'mom', label: 'Variação mensal', unit: '%', decimals: 2, rate: true },
  { id: 'ipca-12m', field: 'y12', label: 'Acumulado em 12 meses', unit: '%', decimals: 2, rate: true },
  { id: 'ipca-ytd', field: 'ytd', label: 'Acumulado no ano', unit: '%', decimals: 2, rate: true },
  { id: 'ipca-index', field: 'index', label: 'Número-índice (dez/1993 = 100)', unit: 'pontos · dez/1993=100', decimals: 2, rate: false },
]

export function normalizeIpca(data) {
  const s = data?.series
  if (s?.id !== 'ipca' || !Array.isArray(s.points) || typeof s.checkedAt !== 'string') throw new Error('Arquivo do IPCA inválido')
  const points = s.points.filter((p) => /^\d{4}-(0[1-9]|1[0-2])$/.test(p?.period)).sort((a, b) => a.period.localeCompare(b.period))
  if (points.length !== s.points.length || new Set(points.map((p) => p.period)).size !== points.length) throw new Error('Histórico do IPCA inválido')
  return { ...s, points }
}

// Série { period, value } de uma leitura; meses sem a leitura (ex.: dez/1979) ficam de fora, nunca viram zero.
export const ipcaSeries = (series, metric) => series.points.filter((p) => Number.isFinite(p[metric.field])).map((p) => ({ period: p.period, value: p[metric.field] }))

// Linhas da tabela: último valor, mês anterior, diferença e mesmo mês do ano anterior.
export function ipcaRows(series) {
  return IPCA_METRICS.map((metric) => {
    const points = ipcaSeries(series, metric)
    const last = points.at(-1) ?? null
    const prev = last ? points.find((p) => p.period === shift(last.period, -1)) ?? null : null
    const yearAgo = last ? points.find((p) => p.period === shift(last.period, -12)) ?? null : null
    return {
      metric, points, last, prev, yearAgo,
      delta: last && prev ? last.value - prev.value : null,
      pct: last && prev && prev.value ? (last.value / prev.value - 1) * 100 : null,
      yoyPct: last && yearAgo && yearAgo.value ? (last.value / yearAgo.value - 1) * 100 : null,
    }
  })
}
function shift(period, months) {
  const d = new Date(`${period}-15T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 7)
}
