export const INSTITUTIONS = ['FOCUS', 'Itaú BBA', 'Bradesco', 'Santander', 'BB', 'BTG']
export const INDICATORS = [
  { id: 'pib', label: 'PIB', unit: '% no ano', focus: 'PIB' },
  { id: 'ipca', label: 'IPCA', unit: '% no ano', focus: 'IPCA' },
  { id: 'selic', label: 'Selic', unit: '% a.a. · dezembro/fim do ano', focus: 'Selic' },
  { id: 'usd', label: 'USD', unit: 'R$/US$', focus: 'Câmbio' },
]
// Compara a projeção de uma instituição com a mediana do Focus da mesma linha: 'up' (acima), 'down' (abaixo), 'same' (igual
// no que a tela mostra, 2 casas) ou null (algum dos dois ausente: nada a sinalizar).
export function compareToFocus(value, focusValue) {
  if (!Number.isFinite(value) || !Number.isFinite(focusValue)) return null
  const a = Math.round(value * 100), b = Math.round(focusValue * 100)
  return a > b ? 'up' : a < b ? 'down' : 'same'
}
export const FOCUS_MARK = { up: { symbol: '▲', text: 'acima do Focus' }, down: { symbol: '▼', text: 'abaixo do Focus' }, same: { symbol: '=', text: 'igual ao Focus' } }

export function scenarioValue(institution, indicator, year, focus, banks) {
  const value = institution === 'FOCUS'
    ? focus?.rows?.find((row) => row.label === indicator.focus)?.values?.[year]?.median
    : banks?.institutions?.find((bank) => bank.name === institution)?.years?.[year]?.[indicator.id]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
