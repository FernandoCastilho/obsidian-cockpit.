// Visão única da aba BNDES: famílias (TFB, TLP, TFC, Moedas) com as mesmas colunas e a série escolhida para o gráfico.
import { PRAZO_LABEL, TFB_DEFINICAO, TLP_DEFINICAO, bndesRows, pointsOf as tfbPoints, tlpView } from './bndes.js'
import { MOEDAS_DEFINICAO, TFC_DEFINICAO, GROUPS, groupRows, pointsOf as moedaPoints } from './moedas.js'

export const FAMILIES = [
  { id: 'tfb', label: 'TFB', title: 'Taxa Fixa do BNDES', definition: TFB_DEFINICAO, source: 'Serviço público de taxas do BNDES (arquivos TFB_prazo_liberação). Uma cotação por dia útil, já disponível no próprio dia (prática observada nas coletas; não há norma publicada sobre o horário). Faixas de 36, 60, 84 e 120 meses com liberação em 30 e 90 dias.' },
  { id: 'tlp', label: 'TLP', title: 'Taxa de Longo Prazo', definition: TLP_DEFINICAO, source: 'Moedas Contratuais do BNDES, moeda 777 (TLP - taxa pré-fixada), desde 2018 (quando a TLP substituiu a TJLP nos contratos do BNDES). Divulgada no último dia útil do mês anterior ao da vigência (Res. CMN 4.600/2017); a data é calculada com o calendário de feriados do Brasil.' },
  { id: 'tfc', label: 'TFC', title: 'TFC · Moedas Contratuais', definition: TFC_DEFINICAO, source: 'Arquivos de cotação das Moedas Contratuais do BNDES (códigos C01 a C26; C19 e C21 não existem na tabela). Uma cotação por dia útil, com histórico a partir de 2025 ou 2026, conforme a série.' },
  { id: 'moedas', label: 'Moedas', title: 'Moedas contratuais', definition: MOEDAS_DEFINICAO, source: 'Arquivos de cotação das Moedas Contratuais do BNDES. Dólar (604) e Selic acumulada (143) variam em %; sobretaxa, TLP-IPCA e TFBTR, em pontos percentuais. A TFBTR (TR1 e TR2) tem um valor por mês. A TLP (777) está na aba TLP.' },
]
export const DEFAULT_SELECTION = { tfb: 'TFB_60_90', tlp: 'TLP', tfc: 'C01', moedas: '604' }

const toRow = (r, id, name, sub) => ({ id, name, sub, missing: !!r.missing, text: r.text, day: r.day ?? null, month: r.month ?? null, year: r.year ?? null, date: r.date, stale: r.stale ?? null })

// Linhas da tabela de uma família (mesmas colunas em todas): série, valor, variações no dia, mês e ano, data.
export function familyRows(family, bndes, moedas, now = Date.now()) {
  if (family === 'tfb') return bndesRows(bndes).map((r) => toRow(r, r.key, `${PRAZO_LABEL[r.prazo]} · ${r.liberacao} dias`, `${r.key} · % a.a.`))
  if (family === 'tlp') {
    const v = tlpView(bndes, now)
    return [v ? { ...toRow({ ...v, missing: false }, 'TLP', 'TLP', '777 · % a.a. · mensal'), nextRelease: v.nextRelease } : { id: 'TLP', name: 'TLP', sub: '777 · % a.a. · mensal', missing: true }]
  }
  return groupRows(moedas, family, now).map((r) => toRow(r, r.id, r.name, `${r.id} · ${r.unit}`))
}

// Série escolhida para o gráfico: nome, código, unidade, casas decimais, tipo de cobertura e pontos até hoje.
export function seriesFor(family, id, bndes, moedas, now = Date.now()) {
  const list = (pts) => pts.map(([period, value]) => ({ period, value }))
  if (family === 'tfb') {
    const [, prazo, lib] = id.split('_')
    return { name: `TFB · ${PRAZO_LABEL[prazo] ?? `${prazo} meses`} · liberação em ${lib} dias`, code: `tfb-${id}`, unit: '% a.a.', kind: 'day', decimals: 2, list: list(tfbPoints(bndes, id)) }
  }
  if (family === 'tlp') return { name: 'TLP · % a.a.', code: 'tlp-bndes', unit: '% a.a.', kind: 'month', decimals: 2, list: list(tlpView(bndes, now)?.points ?? []) }
  const s = GROUPS[family].find((x) => x.id === id) ?? GROUPS[family][0]
  return { name: `${s.name} (${s.id})`, code: `moeda-${s.id}`, unit: s.unit, kind: 'sparse', decimals: s.kind === 'level' ? (s.id === '143' ? 6 : 4) : 2, list: list(moedaPoints(moedas, s.id, now)) }
}
