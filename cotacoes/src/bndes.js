// Apresentação da Taxa Fixa do BNDES (TFB) e da TLP: arquivo bndes.json (TFB: série diária em % a.a. por prazo e dias até a liberação
// dos recursos; TLP: série mensal da moeda 777 do BNDES em % a.a.).
import { tlpNextRelease } from './indexadores.js'
import { JUMP_HINT, isJump } from './jumps.js'
import { nf, shiftMonths, atOrBefore } from './format.js'
export const PRAZOS = [36, 60, 84, 120]
export const LIBERACOES = [30, 90]
export const PRAZO_LABEL = { 36: 'até 36 meses', 60: '36 a 60 meses', 84: '60 a 84 meses', 120: '84 a 120 meses' }
export const TFB_DEFINICAO = 'Taxa Fixa do BNDES. Custo financeiro prefixado, que já incorpora a sobretaxa de referência, por faixa de prazo do financiamento e por prazo até a liberação dos recursos (30 ou 90 dias). A taxa final do cliente ainda soma os spreads do BNDES e do agente financeiro.'
export const keyOf = (prazo, liberacao) => `TFB_${prazo}_${liberacao}`


// Variação em pontos percentuais, com seta (▲ subiu, ▼ caiu, = igual); null quando falta a referência.
// kind: tipo da série quando a variação é a de um dia (só ela leva o selo de salto); sem kind, nunca marca salto.
export function change(value, ref, kind = null) {
  if (!Number.isFinite(value) || !ref) return null
  const diff = value - ref[1]
  const flat = Math.abs(diff) < 0.005
  return { diff, ref: ref[0], dir: flat ? 'same' : diff > 0 ? 'up' : 'down', text: flat ? '= 0,00 p.p.' : `${diff > 0 ? '▲ +' : '▼ −'}${nf(Math.abs(diff))} p.p.`, jump: isJump(kind, diff), hint: JUMP_HINT }
}

// Pontos [[AAAA-MM-DD, valor]] de uma série, ou [] quando ela não existe.
export const pointsOf = (data, key) => (Array.isArray(data?.series?.[key]?.points) ? data.series[key].points : [])

// Linhas da tabela: prazo × liberação, com a cotação mais recente e as variações no dia, em um mês e em um ano.
export function bndesRows(data) {
  return PRAZOS.flatMap((prazo) => LIBERACOES.map((liberacao) => {
    const key = keyOf(prazo, liberacao), points = pointsOf(data, key), base = { key, prazo, liberacao, label: PRAZO_LABEL[prazo] }
    if (!points.length) return { ...base, missing: true }
    const [date, value] = points.at(-1)
    return { ...base, date, value, text: `${nf(value)}% a.a.`, day: change(value, points.length > 1 ? points.at(-2) : null, 'rate'), month: change(value, atOrBefore(points, shiftMonths(date, -1))), year: change(value, atOrBefore(points, shiftMonths(date, -12))), stale: data?.stale?.[key] ?? null }
  }))
}

export const TLP_DEFINICAO = 'Taxa de Longo Prazo. Custo financeiro de referência do BNDES no lugar da TJLP, ligado às taxas de mercado dos títulos públicos (NTN-B). Vale o mês inteiro, em % ao ano; a taxa final do cliente ainda soma os spreads do BNDES e do agente financeiro.'

// TLP mais recente, variação contra o mês anterior e contra 12 meses antes, e a próxima divulgação; null quando não há série.
export function tlpView(data, now = Date.now()) {
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) // o BNDES já publica o mês seguinte no último dia útil
  const points = Array.isArray(data?.tlp?.points) ? data.tlp.points.filter((p) => p[0] <= today) : []
  if (!points.length) return null
  const [date, value] = points.at(-1)
  return { points, date, value, text: `${nf(value)}% a.a.`, month: change(value, points.length > 1 ? points.at(-2) : null, 'rate'), year: change(value, atOrBefore(points, shiftMonths(date, -12))), stale: data?.stale?.TLP ?? null, nextRelease: tlpNextRelease(now) }
}
