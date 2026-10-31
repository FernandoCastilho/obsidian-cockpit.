// Preço diário aproximado de insumos: contrato futuro da COMEX (Yahoo Finance). Atrasado, não oficial; serve de referência, não de preço de negociação.
export const LB_PER_TONNE = 2204.62262185
export const INSUMOS_PRECOS = [
  { id: 'cobre', symbol: 'HG=F', name: 'Cobre · contrato futuro COMEX (HG)', unit: 'USD/tonelada', factor: LB_PER_TONNE, url: 'https://query1.finance.yahoo.com/v8/finance/chart/HG%3DF?interval=1d&range=6mo' },
]
// [[ms, fechamento na unidade original]] -> [[ms, valor na unidade do painel]]; pontos inválidos ficam de fora, nunca viram zero.
export const toDailyPoints = (raw, def) => raw
  .filter(([t, v]) => Number.isFinite(t) && Number.isFinite(v) && v > 0)
  .map(([t, v]) => [t, Math.round(v * def.factor * 100) / 100])
export function dailyFile(series, now, errors = []) {
  return { schemaVersion: 1, generatedAt: now, stale: Object.values(series).length > 0 && Object.values(series).every((s) => s.stale), errors, series }
}
