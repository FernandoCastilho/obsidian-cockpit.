// Presentation only: never feed rounded strings back into the financial model.
export const formatFinimpRate = value => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })
export const formatFinimpPercent = value => `${formatFinimpRate(value)}%`
export function formatFinimpDelta(value) {
  if (value !== 0 && Math.abs(value) < 0.005) return `${value > 0 ? '+' : '−'} < 0,01 p.p.`
  return `${value > 0 ? '+' : ''}${formatFinimpRate(value)} p.p.`
}
