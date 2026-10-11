// Acesso à planilha pela API do Google Sheets. Só grava células pontuais; nunca apaga linhas.
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

export class ErroSessao extends Error {}

async function chamar(token, url, opcoes = {}) {
  const r = await fetch(url, { ...opcoes, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
  if (r.status === 401) throw new ErroSessao('Sua sessão expirou. Entre de novo.')
  if (r.status === 403) throw new Error('Sem permissão nesta planilha. Peça acesso de edição no Drive.')
  if (!r.ok) throw new Error(`Falha ao falar com o Google (${r.status}).`)
  return r.json()
}

const RANGES = ['Pessoas', 'Contas', 'Categorias', 'Subcategorias', 'Lancamentos!A1:S8000', 'ContasFixas!A1:M200', 'ContasFixas!P6']
const NOMES = ['Pessoas', 'Contas', 'Categorias', 'Subcategorias', 'Lancamentos', 'ContasFixas', 'metaFixas']

export async function carregar(token, sheetId) {
  const q = RANGES.map((r) => `ranges=${encodeURIComponent(r)}`).join('&')
  const j = await chamar(token, `${BASE}/${sheetId}/values:batchGet?${q}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`)
  const tabs = Object.fromEntries(j.valueRanges.map((v, i) => [NOMES[i], v.values ?? []]))
  tabs.metaFixas = tabs.metaFixas?.[0]?.[0] ?? 0
  return tabs
}

// grupos = [{ range: 'Lancamentos!I5:J5', values: [[...]] }]
export const gravar = (token, sheetId, grupos) =>
  chamar(token, `${BASE}/${sheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: grupos.map((g) => ({ range: g.range, values: g.values })) }),
  })
