export function chartScale(chart) {
  const values = chart.series.flatMap(series => series.values)
  const negative = values.some(value => value < 0)
  const maximum = Math.max(1, Number(chart.max) || 0, ...values.map(Math.abs))
  return { negative, maximum, zero: negative ? 50 : 0 }
}
export function barPosition(value, scale) {
  const width = Math.abs(value) / scale.maximum * (scale.negative ? 50 : 100)
  return { left: `${value < 0 ? scale.zero - width : scale.zero}%`, width: `${width}%` }
}
export function transcriptParagraphs(transcript) {
  return (Array.isArray(transcript) ? transcript : [transcript]).filter(Boolean).flatMap(text => text.trim().split(/\n\s*\n/)).filter(Boolean)
}
export function transcriptText(transcript) { return transcriptParagraphs(transcript).join('\n\n') }
export function durationLabel(seconds, rate = 1) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Duração disponível após carregar o áudio'
  const total = Math.round(seconds / rate)
  return `${Math.floor(total / 60)} min ${String(total % 60).padStart(2, '0')} s`
}
