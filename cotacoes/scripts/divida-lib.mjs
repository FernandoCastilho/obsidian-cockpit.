// Dívida Bruta do Governo Geral (DBGG, Banco Central, SGS): saldo em R$ milhões e em % do PIB, mensal, desde dez/2006.
export const DIVIDA_SOURCE = 'https://www.bcb.gov.br/estatisticas/historicoestatisticassetorpublico'
export const DIVIDA_CODES = { brl: 13761, pib: 13762 }
export const DIVIDA_FROM = 2006
export const dividaApi = (code, a, b) => `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${a}&dataFinal=${b}`

// SGS: [{data:"01/09/2026", valor:"79.1"}] -> Map "AAAA-MM" -> número
function byMonth(rows, label) {
  if (!Array.isArray(rows) || rows.length < 12) throw new Error(`SGS devolveu poucas linhas (${label})`)
  const out = new Map()
  for (const r of rows) {
    const m = /^(\d{2})\/(0[1-9]|1[0-2])\/(\d{4})$/.exec(r?.data ?? '')
    const v = Number(r?.valor)
    if (!m || r?.valor === '' || r?.valor == null || !Number.isFinite(v) || !(v > 0)) throw new Error(`Linha SGS inválida (${label})`)
    const period = `${m[3]}-${m[2]}`
    if (out.has(period)) throw new Error(`Mês duplicado (${label}): ${period}`)
    out.set(period, v)
  }
  return out
}

// Junta as duas séries por mês. Mês só em uma delas fica com null na outra, nunca vira zero.
export function parseDivida(pibRows, brlRows) {
  const pib = byMonth(pibRows, 'DBGG % PIB'), brl = byMonth(brlRows, 'DBGG R$')
  const periods = [...new Set([...pib.keys(), ...brl.keys()])].sort()
  return periods.map((period) => ({ period, pib: pib.get(period) ?? null, brl: brl.get(period) ?? null }))
}

export function dividaFile(points, checkedAt, { stale = false, error } = {}) {
  return { schemaVersion: 1, generatedAt: checkedAt, series: { id: 'divida-bruta', sourceName: 'Banco Central do Brasil · Estatísticas do setor público (SGS 13761 e 13762)', sourceUrl: DIVIDA_SOURCE, checkedAt, stale, error, points } }
}
