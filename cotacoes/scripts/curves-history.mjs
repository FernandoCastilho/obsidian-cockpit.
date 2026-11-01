// Histórico das curvas da B3 guardado pelo próprio painel: a B3 só publica a curva do último dia, então cada pregão coletado
// entra aqui ({ br: { 'AAAA-MM-DD': [[du, taxa], ...] }, cc: {...} }) e as comparações (1 dia, 1 semana, 1 mês...) saem daqui.
import { pickDates } from './curves-lib.mjs'

export const KEEP_DAYS = 400 // cobre a comparação de 1 ano com folga
const validDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s)

export function emptyHistory() { return { schemaVersion: 1, br: {}, cc: {} } }

// Acrescenta a curva do dia (substitui a do mesmo dia, que pode ter sido republicada) e descarta o que passou de KEEP_DAYS.
export function addToHistory(hist, key, date, pts) {
  const out = { ...emptyHistory(), ...hist, [key]: { ...(hist?.[key] || {}) } }
  if (validDay(date) && Array.isArray(pts) && pts.length) out[key][date] = pts
  const days = Object.keys(out[key]).filter(validDay).sort()
  if (days.length) {
    const cut = new Date(Date.parse(days.at(-1) + 'T12:00:00Z') - KEEP_DAYS * 864e5).toISOString().slice(0, 10)
    for (const d of days) if (d < cut) delete out[key][d]
  }
  return out
}

// Curva publicada: último dia coletado + comparações escolhidas entre as datas que de fato estão no histórico.
export function withHistory(set, histKey) {
  if (!set?.sourceDate || !set.curves?.[set.sourceDate]) return set
  const days = Object.keys(histKey || {}).filter((d) => validDay(d) && d <= set.sourceDate)
  if (!days.includes(set.sourceDate)) days.push(set.sourceDate)
  const picks = pickDates(days)
  const curves = Object.fromEntries(picks.map((p) => [p.date, p.date === set.sourceDate ? set.curves[set.sourceDate] : histKey[p.date]]))
  return { ...set, compare: picks, curves, historyDays: days.length }
}
