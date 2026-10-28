// Apresentação dos indexadores TR, TBF, TLP e TFB (arquivo indexadores.json: SGS do Banco Central e serviço de taxas do BNDES).
const nf = (v, d) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const dm = (t) => new Date(t).toLocaleDateString('pt-BR', { timeZone: 'UTC' })

export const DEFINICOES = {
  TR: 'Taxa Referencial. Calculada pelo Banco Central a partir da TBF, com um redutor. Corrige a poupança (0,5% a.m. + TR, quando a Selic está acima de 8,5% a.a.), o FGTS e parte do crédito imobiliário.',
  TBF: 'Taxa Básica Financeira. Média das taxas de captação (CDB/RDB prefixados) dos grandes bancos, calculada pelo Banco Central. É a base para calcular a TR.',
  TLP: 'Taxa de Longo Prazo. Referência do BNDES, no lugar da TJLP, ligada às taxas de mercado dos títulos públicos. Valor mensal, em % ao ano.',
  TFB: 'Taxa Fixa do BNDES. Custo financeiro prefixado, que já incorpora a sobretaxa de referência, em quatro faixas de prazo do financiamento (liberação dos recursos em até 30 dias). A taxa final do cliente ainda soma os spreads do BNDES e do agente financeiro.',
}
const FAMILIA = (key) => (key.startsWith('TFB') ? 'TFB' : key)
const NOMES = { TR: 'Taxa Referencial', TBF: 'Taxa Básica Financeira', TLP: 'Taxa de Longo Prazo', TFB36: 'Taxa Fixa do BNDES · até 36 meses', TFB60: 'Taxa Fixa do BNDES · 36 a 60 meses', TFB84: 'Taxa Fixa do BNDES · 60 a 84 meses', TFB120: 'Taxa Fixa do BNDES · 84 a 120 meses' }
export const INDEX_KEYS = ['TR', 'TBF', 'TLP', 'TFB36', 'TFB60', 'TFB84', 'TFB120']

// Equivalente anual composto de uma taxa mensal; taxa que já é anual passa direto.
export const anual = (value, unit) => (!Number.isFinite(value) ? null : unit === 'a.m.' ? (Math.pow(1 + value / 100, 12) - 1) * 100 : value)

// Última data do mês da vigência quando a fonte só traz o início (TLP).
const monthEnd = (t) => {
  const d = new Date(t)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12)
}

// Linhas da tabela, na ordem TR, TBF, TLP e TFB (4 prazos). Série ausente vira linha sem valor, para a tela dizer isso em vez de sumir.
export function indexRows(data) {
  return INDEX_KEYS.map((key) => {
    const s = data?.series?.[key]
    if (!s?.latest) return { key, family: FAMILIA(key), name: NOMES[key], missing: true, definition: DEFINICOES[FAMILIA(key)] }
    const { latest, history } = s
    // TLP vale o mês inteiro; TFB é uma cotação por dia útil.
    const end = latest.end ?? (key === 'TLP' ? monthEnd(latest.start) : null)
    const prev = history.length > 1 ? history[history.length - 2] : null
    return {
      key,
      family: FAMILIA(key),
      name: s.name,
      code: s.code,
      sourceText: `${s.source === 'BNDES' ? 'BNDES' : 'SGS'} ${s.code}`,
      unit: s.unit,
      value: latest.value,
      text: `${nf(latest.value, s.unit === 'a.m.' ? 4 : 2)}% ${s.unit}`,
      annual: anual(latest.value, s.unit),
      annualText: s.unit === 'a.m.' ? `${nf(anual(latest.value, s.unit), 2)}% a.a.` : null,
      period: end ? `${dm(latest.start)} a ${dm(end)}` : `em ${dm(latest.start)}`,
      delta: prev ? latest.value - prev.value : null,
      stale: data?.stale?.[key] ?? null,
      definition: DEFINICOES[FAMILIA(key)],
    }
  })
}
