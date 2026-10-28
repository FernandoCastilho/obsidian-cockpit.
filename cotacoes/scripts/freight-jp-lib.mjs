// Frete marítimo do Japão: índice de preços de serviços (SPPI, base 2020) do Banco do Japão, item "Ocean freight transportation".
export const BOJ_SERIES = 'PRCS20_5200730001'
export const BOJ_API = `https://www.stat-search.boj.or.jp/api/v1/getDataCode?format=json&lang=en&db=PR02&code=${BOJ_SERIES}`
export const BOJ_SOURCE = 'https://www.boj.or.jp/en/statistics/pi/sppi_2020/index.htm'

// Resposta da API do BoJ -> pontos { period: 'AAAA-MM', value }. `null` na fonte (mês sem dado) é descartado, nunca vira zero.
export function parseBoj(payload) {
  if (payload?.STATUS !== 200) throw new Error(`BoJ não confirmou a consulta (${payload?.MESSAGE ?? 'sem mensagem'})`)
  const set = payload.RESULTSET?.filter((r) => r?.SERIES_CODE === BOJ_SERIES)
  if (set?.length !== 1) throw new Error('Série do BoJ incompatível')
  const dates = set[0].VALUES?.SURVEY_DATES, values = set[0].VALUES?.VALUES
  if (!Array.isArray(dates) || !Array.isArray(values) || dates.length !== values.length) throw new Error('Observações do BoJ inconsistentes')
  const points = []
  dates.forEach((d, i) => {
    const s = String(d)
    if (!/^\d{6}$/.test(s) || !/^(0[1-9]|1[0-2])$/.test(s.slice(4))) throw new Error(`Mês inválido no BoJ: ${s}`)
    const v = values[i]
    if (v === null || v === undefined || v === '') return
    if (!Number.isFinite(Number(v)) || !(Number(v) > 0)) throw new Error('Valor inválido no BoJ')
    points.push({ period: `${s.slice(0, 4)}-${s.slice(4)}`, value: Number(v) })
  })
  return { points, next: payload.NEXTPOSITION ?? null }
}

export function freightJpFile(points, checkedAt, { stale = false, error } = {}) {
  return { schemaVersion: 1, generatedAt: checkedAt, series: { id: 'freight-jp-sppi', unit: 'pontos · média de 2020 = 100', frequency: 'monthly', sourceName: 'Banco do Japão (BoJ) · SPPI', sourceUrl: BOJ_SOURCE, checkedAt, stale, error, releaseDate: null, points, revisionNote: 'Índice de preços de serviços do Banco do Japão (base 2020), item transporte marítimo de carga; valores podem ser revisados pelo BoJ.' } }
}
