// Apresentação dos indexadores TR, TBF e TLP (arquivo indexadores.json: SGS do Banco Central).
import { addDays, isBusinessDay } from './holidays.js'
const nf = (v, d) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const dm = (t) => new Date(t).toLocaleDateString('pt-BR', { timeZone: 'UTC' })

export const DEFINICOES = {
  TR: 'Taxa Referencial. Calculada pelo Banco Central a partir da TBF, com um redutor. Corrige a poupança (0,5% a.m. + TR, quando a Selic está acima de 8,5% a.a.), o FGTS e parte do crédito imobiliário.',
  TBF: 'Taxa Básica Financeira. Média das taxas de captação (CDB/RDB prefixados) dos grandes bancos, calculada pelo Banco Central. É a base para calcular a TR.',
  TLP: 'Taxa de Longo Prazo. Referência do BNDES, no lugar da TJLP, ligada às taxas de mercado dos títulos públicos. Valor mensal, em % ao ano.',
}
const FAMILIA = (key) => key
const NOMES = { TR: 'Taxa Referencial', TBF: 'Taxa Básica Financeira', TLP: 'Taxa de Longo Prazo' }
export const INDEX_KEYS = ['TR', 'TBF', 'TLP']

// Quando o governo costuma divulgar cada indexador. TR e TBF: Res. CMN 4.624/2018 (até o 1º dia útil posterior ao dia de referência);
// TLP: Res. CMN 4.600/2017 (último dia útil do mês anterior ao da vigência).
export const DIVULGACAO = {
  TR: { rule: 'Diária, até o 1º dia útil seguinte à data de referência', norm: 'Res. CMN 4.624/2018 (Banco Central)' },
  TBF: { rule: 'Diária, até o 1º dia útil seguinte à data de referência', norm: 'Res. CMN 4.624/2018 (Banco Central)' },
  TLP: { rule: 'Mensal, no último dia útil do mês anterior ao da vigência', norm: 'Res. CMN 4.600/2017 (Banco Central)' },
}
const ymd = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
const brIso = (s) => s.split('-').reverse().join('/')
const dmIso = (s) => brIso(s).slice(0, 5)

// Último dia útil (calendário do Brasil) do mês y/m (m de 1 a 12), em AAAA-MM-DD.
export function lastBusinessDay(y, m) {
  let d = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  for (let i = 0; i < 10 && !isBusinessDay(d, 'BR'); i++) d = addDays(d, -1)
  return d
}
// Próxima divulgação da TLP a partir de `now`: o último dia útil do mês corrente, ou do seguinte se esse já passou.
export function tlpNextRelease(now = Date.now()) {
  const today = ymd(now), [y, m] = today.split('-').map(Number)
  const cur = lastBusinessDay(y, m)
  return today <= cur ? cur : lastBusinessDay(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1)
}
// 1º dia útil posterior ao dia de referência (prazo de divulgação de TR e TBF).
export function dailyDue(refIso) {
  let d = addDays(refIso, 1)
  for (let i = 0; i < 10 && !isBusinessDay(d, 'BR'); i++) d = addDays(d, 1)
  return d
}

// Equivalente anual composto de uma taxa mensal; taxa que já é anual passa direto.
export const anual = (value, unit) => (!Number.isFinite(value) ? null : unit === 'a.m.' ? (Math.pow(1 + value / 100, 12) - 1) * 100 : value)

// Última data do mês da vigência quando a fonte só traz o início (TLP).
const monthEnd = (t) => {
  const d = new Date(t)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12)
}

// Complemento da divulgação: prazo do último dado (TR/TBF) ou próxima data (TLP).
function releaseDetail(fam, latest, now) {
  const ref = ymd(latest.start)
  if (fam === 'TLP') return `última: vigência de ${dm(latest.start)} · próxima: ${brIso(tlpNextRelease(now))}`
  return `última referência ${dmIso(ref)}, divulgada até ${dmIso(dailyDue(ref))}`
}

// Linhas da tabela, na ordem TR, TBF e TLP. Série ausente vira linha sem valor, para a tela dizer isso em vez de sumir.
export function indexRows(data, now = Date.now()) {
  return INDEX_KEYS.map((key) => {
    const s = data?.series?.[key]
    const fam = FAMILIA(key), div = DIVULGACAO[fam]
    if (!s?.latest) return { key, family: fam, name: NOMES[key], missing: true, definition: DEFINICOES[fam], release: { ...div, detail: fam === 'TLP' ? `próxima: ${brIso(tlpNextRelease(now))}` : null } }
    const { latest, history } = s
    // TLP vale o mês inteiro.
    const end = latest.end ?? (key === 'TLP' ? monthEnd(latest.start) : null)
    const prev = history.length > 1 ? history[history.length - 2] : null
    return {
      key,
      family: FAMILIA(key),
      name: s.name,
      code: s.code,
      sourceText: `SGS ${s.code}`,
      unit: s.unit,
      value: latest.value,
      text: `${nf(latest.value, s.unit === 'a.m.' ? 4 : 2)}% ${s.unit}`,
      annual: anual(latest.value, s.unit),
      annualText: s.unit === 'a.m.' ? `${nf(anual(latest.value, s.unit), 2)}% a.a.` : null,
      period: end ? `${dm(latest.start)} a ${dm(end)}` : `em ${dm(latest.start)}`,
      delta: prev ? latest.value - prev.value : null,
      stale: data?.stale?.[key] ?? null,
      definition: DEFINICOES[FAMILIA(key)],
      release: { ...div, detail: releaseDetail(fam, latest, now) },
    }
  })
}
