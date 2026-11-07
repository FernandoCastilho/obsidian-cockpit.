// Presentation only: never replace absent prices or refresh an observation date.
export function latestDailyPoint(series) {
  return (Array.isArray(series?.points) ? series.points : [])
    .filter(point => Array.isArray(point) && Number.isFinite(point[0]) && point[0] > 0 && point[0] <= Date.now() && Number.isFinite(point[1]) && point[1] > 0)
    .sort((a, b) => a[0] - b[0]).at(-1) ?? null
}
export function referencePeriod(value) {
  return /^\d{4}-\d{2}(?:-\d{2})?$/.test(value ?? '') ? value.split('-').reverse().join('/') : 'data não informada'
}
export function publicReference(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'gov.br' || url.hostname.endsWith('.gov.br') || url.hostname.endsWith('.gov') || url.hostname === 'worldbank.org' || url.hostname.endsWith('.worldbank.org'))
  } catch { return false }
}
