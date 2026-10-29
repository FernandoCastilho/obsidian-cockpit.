// IPCA por grupos (IBGE, SIDRA tabela 7060): variação mensal, acumulada no ano, em 12 meses e peso mensal de cada grupo, últimos 13 meses.
export const IPCA_GROUPS_SOURCE = 'https://sidra.ibge.gov.br/tabela/7060'
const GROUP_CODES = '7169,7170,7445,7486,7558,7625,7660,7712,7766,7786'
export const IPCA_GROUPS_API = `https://apisidra.ibge.gov.br/values/t/7060/n1/1/v/63,66,69,2265/p/last%2013/c315/${GROUP_CODES}?formato=json`
const FIELD = { 63: 'mom', 66: 'weight', 69: 'ytd', 2265: 'y12' }
const NAME = { 7169: 'Índice geral', 7170: 'Alimentação e bebidas', 7445: 'Habitação', 7486: 'Artigos de residência', 7558: 'Vestuário', 7625: 'Transportes', 7660: 'Saúde e cuidados pessoais', 7712: 'Despesas pessoais', 7766: 'Educação', 7786: 'Comunicação' }

// Resposta do SIDRA (1ª linha = cabeçalho) -> { periods: ['AAAA-MM', ...], groups: [{ id, name, byPeriod: { 'AAAA-MM': { mom, weight, ytd, y12 } } }] }.
// Valor ausente ("...", "-") fica de fora: nunca vira zero.
export function parseIpcaGroups(rows) {
  if (!Array.isArray(rows) || rows.length < 20) throw new Error('SIDRA devolveu poucas linhas')
  const groups = new Map(), periods = new Set()
  for (const r of rows.slice(1)) {
    const field = FIELD[r?.D2C], id = Number(r?.D4C), code = String(r?.D3C ?? '')
    if (!field || !NAME[id] || !/^\d{6}$/.test(code)) throw new Error('Linha SIDRA inesperada')
    const period = `${code.slice(0, 4)}-${code.slice(4)}`
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error(`Mês inválido: ${code}`)
    periods.add(period)
    if (!/^-?\d+(?:\.\d+)?$/.test(r.V ?? '')) continue
    if (!groups.has(id)) groups.set(id, { id, name: NAME[id], byPeriod: {} })
    const g = groups.get(id)
    g.byPeriod[period] = { ...(g.byPeriod[period] ?? {}), [field]: Number(r.V) }
  }
  const list = [...periods].sort()
  const out = Object.keys(NAME).map((id) => groups.get(Number(id))).filter(Boolean)
  if (list.length < 2 || out.length < 10 || !out.every((g) => Number.isFinite(g.byPeriod[list.at(-1)]?.mom))) throw new Error('IPCA por grupos incompleto')
  return { periods: list, groups: out }
}

export function ipcaGroupsFile(parsed, checkedAt, { stale = false, error } = {}) {
  return { schemaVersion: 1, generatedAt: checkedAt, series: { id: 'ipca-groups', sourceName: 'IBGE · SIDRA, tabela 7060 (IPCA por grupos)', sourceUrl: IPCA_GROUPS_SOURCE, checkedAt, stale, error, periods: parsed?.periods ?? [], groups: parsed?.groups ?? [] } }
}
