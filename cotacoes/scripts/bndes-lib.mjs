// Taxa Fixa do BNDES (TFB): série diária em % a.a. por prazo do financiamento (36, 60, 84 e 120 meses) e dias até a liberação dos recursos
// (30 e 90; o serviço devolve vazio para 60 e 404 para 120). Fonte: serviço público de taxas do BNDES, arquivo .txt com todo o histórico
// ("data;<tab>valor", data dd/mm/aaaa e vírgula decimal). Sem dependências.
export const PRAZOS = [36, 60, 84, 120]
export const LIBERACOES = [30, 90]
export const BNDES_SERIES = PRAZOS.flatMap((prazo) => LIBERACOES.map((liberacao) => ({ key: `TFB_${prazo}_${liberacao}`, prazo, liberacao })))
export const txtUrl = (key) => `https://www.bndes.gov.br/apoioFinanceiro/rest/taxas/${key}.txt`

const DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/
// Texto do arquivo -> [[AAAA-MM-DD, valor]] em ordem crescente, sem datas repetidas, sem linhas inválidas.
export function parseTxt(text) {
  const byDay = new Map()
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const [d, v] = line.split(';').map((s) => s.trim())
    const m = DATE.exec(d ?? '')
    if (!m) continue // cabeçalho "data;valor" e linhas vazias
    const value = Number(String(v ?? '').replace(/\./g, '').replace(',', '.'))
    const iso = `${m[3]}-${m[2]}-${m[1]}`
    const real = new Date(`${iso}T12:00:00Z`)
    if (!Number.isFinite(value) || value <= 0 || value > 100 || Number.isNaN(+real) || real.toISOString().slice(0, 10) !== iso) continue // 31/02 e afins
    byDay.set(iso, value)
  }
  return [...byDay].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

// results = { TFB_36_30: texto|null, ... } -> arquivo public/bndes.json (valores com 4 casas, para o arquivo ficar enxuto)
export function buildBndes(results, errors = [], now = Date.now()) {
  const series = {}
  for (const s of BNDES_SERIES) {
    const points = parseTxt(results?.[s.key])
    if (points.length) series[s.key] = { prazo: s.prazo, liberacao: s.liberacao, points: points.map(([d, v]) => [d, Math.round(v * 1e4) / 1e4]) }
  }
  return { schemaVersion: 1, generatedAt: now, series, errors }
}

// Série que falhou nesta coleta volta com o último dado publicado; `stale` guarda o instante da coleta original.
export function fillSeriesFromPrevious(out, prev) {
  const stale = {}
  for (const { key } of BNDES_SERIES) {
    if (!out.series[key] && prev?.series?.[key]) {
      out.series[key] = prev.series[key]
      stale[key] = prev.stale?.[key] ?? prev.generatedAt ?? null
    }
  }
  out.stale = stale
  return out
}
