// Escala do gráfico: agrupa os pontos por hora, dia, mês ou ano (valor = último ponto do período; máxima/mínima do período).
// Só agrupa para escalas mais grossas que o dado original: hora a hora não existe em série diária.
import { marketDate } from './marketReturns.js'

const SP = 'America/Sao_Paulo'
const hourOf = (t) => new Intl.DateTimeFormat('en-GB', { timeZone: SP, hour: '2-digit', hour12: false }).format(new Date(t)).slice(0, 2)
const MIN = 60e3
const DAY = 864e5

// maxStep: o espaçamento típico do dado tem de ser menor que isso para a escala fazer sentido.
export const SCALES = [
  { id: 'hora', label: 'Hora', title: 'Um ponto por hora', maxStep: 55 * MIN, key: (t) => `${marketDate(t)}T${hourOf(t)}`, name: (t) => `${marketDate(t).split('-').reverse().slice(0, 2).join('/')} ${hourOf(t)}h` },
  { id: 'dia', label: 'Dia', title: 'Um ponto por dia', maxStep: 1.5 * DAY, key: (t) => marketDate(t) },
  { id: 'mes', label: 'Mês', title: 'Um ponto por mês (último dia com dado)', maxStep: 20 * DAY, key: (t) => marketDate(t).slice(0, 7), name: (t) => new Date(t).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: SP }).replace('.', '') },
  { id: 'ano', label: 'Ano', title: 'Um ponto por ano (último dia com dado)', maxStep: 300 * DAY, key: (t) => marketDate(t).slice(0, 4), name: (t) => String(new Date(t).toLocaleDateString('pt-BR', { year: 'numeric', timeZone: SP })) },
]

// Espaçamento típico (mediana) entre pontos consecutivos.
export function nativeStep(points) {
  const d = []
  for (let i = 1; i < points.length; i++) { const s = points[i].t - points[i - 1].t; if (s > 0) d.push(s) }
  if (!d.length) return Infinity
  d.sort((a, b) => a - b)
  return d[d.length >> 1]
}

export function resample(points, id) {
  const scale = SCALES.find((s) => s.id === id)
  if (!scale || !Array.isArray(points)) return points
  const buckets = new Map()
  for (const p of points) {
    const k = scale.key(p.t), b = buckets.get(k)
    const hi = p.high ?? p.bid, lo = p.low ?? p.bid
    if (!b) buckets.set(k, { ...p, high: hi, low: lo })
    else buckets.set(k, { ...p, high: Math.max(b.high, hi), low: Math.min(b.low, lo) })
  }
  return [...buckets.values()].sort((a, b) => a.t - b.t)
}

// Escalas oferecidas para estes pontos, com o motivo quando não cabem.
export function scaleOptions(points) {
  const step = Array.isArray(points) && points.length > 1 ? nativeStep(points) : Infinity
  return SCALES.map((s) => {
    if (!(step < s.maxStep)) return { ...s, enabled: false, reason: step === Infinity ? 'Poucos pontos' : `Os dados não têm detalhe de ${s.label.toLowerCase()}` }
    const n = resample(points, s.id).length
    return n >= 2 ? { ...s, enabled: true, count: n } : { ...s, enabled: false, reason: 'Período curto: só um ponto nessa escala' }
  })
}
