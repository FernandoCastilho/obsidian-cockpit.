// Histórico do Focus: a mediana das expectativas anuais (Selic, IPCA, PIB e câmbio) semana a semana, para os dois anos da
// tabela de Cenário econômico. Fonte: Olinda/BCB (ExpectativasMercadoAnuais, baseCalculo 0). Um ponto por semana (o último
// dia com dado de cada semana, normalmente a sexta, que é a data de corte do boletim de segunda).
export const INDICADORES = { Selic: 'Selic', IPCA: 'IPCA', 'PIB Total': 'PIB', Câmbio: 'Câmbio' }
export const SEMANAS = 52
const DIA = 864e5

// Anos de referência mantidos: o ano corrente e o seguinte (os mesmos da tabela).
export const anosDe = (now = Date.now()) => { const y = new Date(now).getUTCFullYear(); return [String(y), String(y + 1)] }

// Segunda-feira (UTC) da semana de uma data "AAAA-MM-DD": chave da semana.
export const semanaDe = (d) => { const t = new Date(`${d}T12:00:00Z`); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); return t.toISOString().slice(0, 10) }

// Linhas do Olinda -> { label: { ano: [{ d, v }] } }, um ponto por semana (o último dia da semana com mediana), em ordem de data.
export function semanal(rows, anos) {
  const out = {}
  for (const r of Array.isArray(rows) ? rows : []) {
    const label = INDICADORES[r.Indicador]
    const ano = String(r.DataReferencia ?? '')
    const v = Number(r.Mediana)
    if (!label || !anos.includes(ano) || !/^\d{4}-\d{2}-\d{2}$/.test(r.Data ?? '') || !Number.isFinite(v)) continue
    const porAno = (out[label] ??= {})
    const porSemana = (porAno[ano] ??= new Map())
    const chave = semanaDe(r.Data)
    const atual = porSemana.get(chave)
    if (!atual || r.Data > atual.d) porSemana.set(chave, { d: r.Data, v })
  }
  for (const label of Object.keys(out)) for (const ano of Object.keys(out[label])) out[label][ano] = [...out[label][ano].values()].sort((a, b) => a.d.localeCompare(b.d))
  return out
}

// Junta o histórico já publicado com os pontos novos (a semana nova substitui a antiga), mantém só os anos da tabela e as
// últimas SEMANAS semanas.
export function mesclar(previous, novos, now = Date.now(), semanas = SEMANAS) {
  const anos = anosDe(now)
  const limite = new Date(now - semanas * 7 * DIA).toISOString().slice(0, 10)
  const out = {}
  for (const label of Object.values(INDICADORES)) {
    for (const ano of anos) {
      const porSemana = new Map()
      for (const p of [...(previous?.series?.[label]?.[ano] ?? []), ...(novos?.[label]?.[ano] ?? [])]) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(p?.d ?? '') || !Number.isFinite(p.v) || p.d < limite) continue
        const chave = semanaDe(p.d), atual = porSemana.get(chave)
        if (!atual || p.d >= atual.d) porSemana.set(chave, { d: p.d, v: p.v })
      }
      const pontos = [...porSemana.values()].sort((a, b) => a.d.localeCompare(b.d))
      if (pontos.length) (out[label] ??= {})[ano] = pontos
    }
  }
  return out
}

// Última data presente no histórico (para pedir ao Olinda só o que falta).
export function ultimaData(series) {
  let max = ''
  for (const porAno of Object.values(series ?? {})) for (const pontos of Object.values(porAno)) for (const p of pontos) if (p.d > max) max = p.d
  return max || null
}

export function arquivoHistorico(series, now = Date.now(), { stale = false, error = null } = {}) {
  return { schemaVersion: 1, generatedAt: new Date(now).toISOString(), semanas: SEMANAS, anos: anosDe(now), fonte: 'Banco Central · Olinda · ExpectativasMercadoAnuais (mediana, baseCalculo 0)', stale, error, series }
}
