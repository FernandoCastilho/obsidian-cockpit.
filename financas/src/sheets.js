// Leitura da planilha "Caixa Central - Base de Dados" pela API do Google Sheets.
export const TABS = ['Pessoas', 'Contas', 'Categorias', 'Subcategorias', 'Lancamentos', 'Orcamento']

export async function fetchTabs(sheetId, token) {
  const q = TABS.map((t) => `ranges=${encodeURIComponent(t)}`).join('&')
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values:batchGet?${q}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body?.error?.message || `Erro ${res.status} ao ler a planilha.`)
    err.status = res.status
    throw err
  }
  const json = await res.json()
  const out = {}
  for (const r of json.valueRanges ?? []) out[r.range.split('!')[0].replace(/'/g, '')] = r.values ?? []
  return out
}
