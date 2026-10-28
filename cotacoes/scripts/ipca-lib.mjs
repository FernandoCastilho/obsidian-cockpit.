// IPCA oficial (IBGE, SIDRA tabela 1737): variação mensal, acumulados no ano e em 12 meses e número-índice, desde dez/1979.
export const IPCA_SOURCE = 'https://sidra.ibge.gov.br/tabela/1737'
export const IPCA_API = 'https://apisidra.ibge.gov.br/values/t/1737/n1/1/v/63,69,2265,2266/p/all?formato=json'
const FIELD = { 63: 'mom', 69: 'ytd', 2265: 'y12', 2266: 'index' }

// Resposta do SIDRA (lista de objetos; a 1ª linha é o cabeçalho) -> pontos mensais { period, mom, ytd, y12, index }.
export function parseIpca(rows) {
  if (!Array.isArray(rows) || rows.length < 13) throw new Error('SIDRA devolveu poucas linhas')
  const byPeriod = new Map()
  for (const r of rows.slice(1)) {
    const field = FIELD[r?.D2C]
    const code = String(r?.D3C ?? '')
    if (!field || !/^\d{6}$/.test(code)) throw new Error('Linha SIDRA inesperada')
    const period = `${code.slice(0, 4)}-${code.slice(4)}`
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error(`Mês inválido: ${code}`)
    if (!/^-?\d+(?:\.\d+)?$/.test(r.V ?? '')) continue // "..." = sem divulgação para o mês (dez/1979): não vira zero
    const p = byPeriod.get(period) ?? { period, mom: null, ytd: null, y12: null, index: null }
    p[field] = Number(r.V)
    byPeriod.set(period, p)
  }
  const points = [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period))
  if (points.length < 12 || !points.some((p) => p.index > 0)) throw new Error('Série IPCA incompleta')
  return points
}

export function ipcaFile(points, checkedAt, { stale = false, error } = {}) {
  return { schemaVersion: 1, generatedAt: checkedAt, series: { id: 'ipca', sourceName: 'IBGE · SIDRA, tabela 1737 (IPCA)', sourceUrl: IPCA_SOURCE, checkedAt, stale, error, points } }
}
