// Apresentação dos indexadores TR, TBF e TLP (arquivo indexadores.json, coletado do SGS do Banco Central).
const nf = (v, d) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const dm = (t) => new Date(t).toLocaleDateString('pt-BR', { timeZone: 'UTC' })

export const DEFINICOES = {
  TR: 'Taxa Referencial. Calculada pelo Banco Central a partir da TBF, com um redutor. Corrige a poupança (0,5% a.m. + TR, quando a Selic está acima de 8,5% a.a.), o FGTS e parte do crédito imobiliário.',
  TBF: 'Taxa Básica Financeira. Média das taxas de captação (CDB/RDB prefixados) dos grandes bancos, calculada pelo Banco Central. É a base para calcular a TR.',
  TLP: 'Taxa de Longo Prazo. Referência do BNDES, no lugar da TJLP, ligada às taxas de mercado dos títulos públicos. Valor mensal, em % ao ano.',
}

// Equivalente anual composto de uma taxa mensal; taxa que já é anual passa direto.
export const anual = (value, unit) => (!Number.isFinite(value) ? null : unit === 'a.m.' ? (Math.pow(1 + value / 100, 12) - 1) * 100 : value)

// Última data do mês da vigência quando a fonte só traz o início (TLP).
const monthEnd = (t) => {
  const d = new Date(t)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12)
}

// Linhas da tabela, na ordem TR, TBF, TLP. Série ausente vira linha sem valor, para a tela dizer isso em vez de sumir.
export function indexRows(data) {
  return ['TR', 'TBF', 'TLP'].map((key) => {
    const s = data?.series?.[key]
    if (!s?.latest) return { key, name: { TR: 'Taxa Referencial', TBF: 'Taxa Básica Financeira', TLP: 'Taxa de Longo Prazo' }[key], missing: true, definition: DEFINICOES[key] }
    const { latest, history } = s
    const end = latest.end ?? (s.unit === 'a.a.' ? monthEnd(latest.start) : null)
    const prev = history.length > 1 ? history[history.length - 2] : null
    return {
      key,
      name: s.name,
      code: s.code,
      unit: s.unit,
      value: latest.value,
      text: `${nf(latest.value, key === 'TLP' ? 2 : 4)}% ${s.unit}`,
      annual: anual(latest.value, s.unit),
      annualText: s.unit === 'a.m.' ? `${nf(anual(latest.value, s.unit), 2)}% a.a.` : null,
      period: end ? `${dm(latest.start)} a ${dm(end)}` : `desde ${dm(latest.start)}`,
      delta: prev ? latest.value - prev.value : null,
      stale: data?.stale?.[key] ?? null,
      definition: DEFINICOES[key],
    }
  })
}
