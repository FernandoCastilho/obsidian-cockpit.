export const INSTITUTIONS = ['FOCUS', 'Itaú BBA', 'Bradesco', 'Santander', 'BB', 'BTG']
export const INDICATORS = [
  { id: 'pib', label: 'PIB', unit: '% no ano', focus: 'PIB' },
  { id: 'ipca', label: 'IPCA', unit: '% no ano', focus: 'IPCA' },
  { id: 'selic', label: 'Selic', unit: '% a.a. · fim do ano', focus: 'Selic' },
  { id: 'usd', label: 'USD', unit: 'R$/US$', focus: 'Câmbio' },
]
export function scenarioValue(institution, indicator, year, focus, banks) {
  const value = institution === 'FOCUS'
    ? focus?.rows?.find((row) => row.label === indicator.focus)?.values?.[year]?.median
    : banks?.institutions?.find((bank) => bank.name === institution)?.years?.[year]?.[indicator.id]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
