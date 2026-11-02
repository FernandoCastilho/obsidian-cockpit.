// Acesso à planilha pela API do Google Sheets. Só grava células pontuais; nunca apaga linhas.
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

export class ErroSessao extends Error {}
export class ErroConflito extends Error {}
export class ErroGravacaoIncerta extends Error {}

async function chamar(token, url, opcoes = {}) {
  const r = await fetch(url, { ...opcoes, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
  if (r.status === 401) throw new ErroSessao('Sua sessão expirou. Entre de novo.')
  if (!r.ok) {
    const erro = new Error(r.status === 403 ? 'Sem permissão nesta planilha. Peça acesso de edição no Drive.' : `Falha ao falar com o Google (${r.status}).`)
    erro.status = r.status
    throw erro
  }
  return r.json()
}

const RANGES = ['Pessoas', 'Contas', 'Categorias', 'Subcategorias', 'Lancamentos!A1:S8000', 'ContasFixas!A1:M200', 'ContasFixas!P6']
const NOMES = ['Pessoas', 'Contas', 'Categorias', 'Subcategorias', 'Lancamentos', 'ContasFixas', 'metaFixas']
const OPCAO_LEITURA = 'valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING'

export async function carregar(token, sheetId) {
  const q = RANGES.map((r) => `ranges=${encodeURIComponent(r)}`).join('&')
  const j = await chamar(token, `${BASE}/${sheetId}/values:batchGet?${q}&${OPCAO_LEITURA}`)
  const tabs = Object.fromEntries(j.valueRanges.map((v, i) => [NOMES[i], v.values ?? []]))
  tabs.metaFixas = tabs.metaFixas?.[0]?.[0] ?? 0
  return tabs
}

const ABAS_GRAVAVEIS = {
  Lancamentos: { id: 'lancamento_id', range: 'Lancamentos!A:S', campos: ['subcategoria_id', 'tipo', 'revisado'] },
  ContasFixas: { id: 'conta_fixa_id', range: 'ContasFixas!A:M', campos: ['pago', 'valor_mes'] },
}
const normalizar = (v) => String(v ?? '').normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
const conflito = () => new ErroConflito('A planilha mudou ou o lançamento não pôde ser identificado com segurança. Atualize os dados e tente novamente.')
const celula = (v) => v == null ? '' : v
const linha = (r) => {
  if (!Array.isArray(r)) throw conflito()
  const out = Array.from(r, celula)
  while (out.length && out.at(-1) === '') out.pop()
  return out
}
const igual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
const letra = (indice) => {
  let n = indice + 1, s = ''
  while (n > 0) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26) }
  return s
}

function localizar(values, chave, id, campos) {
  if (!Array.isArray(values) || !values.length) throw conflito()
  const cab = linha(values[0])
  if (!cab.length || cab.some((v) => typeof v !== 'string' || !normalizar(v))) throw conflito()
  const nomes = cab.map(normalizar)
  if (new Set(nomes).size !== nomes.length || !nomes.includes(chave) || campos.some((c) => !nomes.includes(c))) throw conflito()
  const colId = nomes.indexOf(chave)
  const encontrados = []
  for (let i = 1; i < values.length; i++) {
    if (!Array.isArray(values[i])) throw conflito()
    const valorId = values[i][colId]
    if (String(valorId ?? '').trim() === id) {
      if (String(valorId) !== id) throw conflito()
      encontrados.push(i)
    }
  }
  if (encontrados.length !== 1) throw conflito()
  const posicao = encontrados[0]
  return { cab, nomes, posicao, registro: linha(values[posicao]) }
}

function validarMudancas(mudancas, permitidos) {
  if (!mudancas || typeof mudancas !== 'object' || Array.isArray(mudancas)) throw new Error('Alteração inválida.')
  const entries = Object.entries(mudancas)
  if (!entries.length || entries.some(([c]) => !permitidos.includes(c))) throw new Error('Campo não permitido para gravação.')
  for (const [campo, valor] of entries) {
    if (campo === 'valor_mes') {
      if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) throw new Error('Informe um valor válido.')
    } else if (campo === 'pago' || campo === 'revisado') {
      if (!['Sim', 'Não'].includes(valor)) throw new Error('Situação inválida para gravação.')
    } else if (campo === 'tipo') {
      if (!['receita', 'despesa', 'transferencia', 'pagto_fatura', 'investimento', 'reembolso'].includes(valor)) throw new Error('Tipo de lançamento inválido.')
    } else if (typeof valor !== 'string' || !valor.trim() || valor !== valor.trim() || /^[=+@-]/.test(valor)) throw new Error('Subcategoria inválida.')
  }
  return entries
}

// Mitigação, não transação: esta API não dispõe aqui de uma condição atômica por ID/versão.
// Uma edição externa DEPOIS da conferência ainda pode ocorrer antes da escrita.
// Por isso não há repetição automática nem tentativa de desfazer uma resposta incerta.
export async function gravarRegistro(token, sheetId, { aba, id, esperado, mudancas } = {}) {
  const spec = Object.hasOwn(ABAS_GRAVAVEIS, aba) ? ABAS_GRAVAVEIS[aba] : null
  if (!spec) throw new Error('Aba não permitida para gravação.')
  if (typeof id !== 'string' || !id.trim() || id !== id.trim() || ['undefined', 'null'].includes(id)) throw new Error('Identificador inválido. Atualize os dados.')
  const entries = validarMudancas(mudancas, spec.campos)
  const antes = localizar(esperado, spec.id, id, entries.map(([c]) => c))
  // Lê todas as linhas nas colunas da tabela, inclusive IDs além da janela inicial do app.
  // A meta de ContasFixas (P6) fica fora da tabela A:M e não deve virar parte do registro.
  const q = `ranges=${encodeURIComponent(spec.range)}`
  let j
  try {
    j = await chamar(token, `${BASE}/${sheetId}/values:batchGet?${q}&${OPCAO_LEITURA}`)
  } catch (e) {
    if (e instanceof ErroSessao || e.status === 403) throw e
    throw new Error('Não foi possível conferir os dados. Nenhuma gravação foi enviada. Atualize os dados e tente novamente.', { cause: e })
  }
  if (!Array.isArray(j?.valueRanges) || j.valueRanges.length !== 1) throw conflito()
  const atuais = j.valueRanges[0]?.values ?? []
  const agora = localizar(atuais, spec.id, id, entries.map(([c]) => c))
  if (!igual(antes.cab, agora.cab) || antes.posicao !== agora.posicao || !igual(antes.registro, agora.registro)) throw conflito()
  const data = entries.map(([campo, valor]) => ({ range: `${aba}!${letra(agora.nomes.indexOf(campo))}${agora.posicao + 1}`, values: [[valor]] }))
  try {
    const resposta = await chamar(token, `${BASE}/${sheetId}/values:batchUpdate`, { method: 'POST', body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }) })
    if (resposta.totalUpdatedCells !== entries.length || !Array.isArray(resposta.responses) || resposta.responses.length !== entries.length || resposta.responses.some((r) => r.updatedCells !== 1)) throw new Error('Resposta de gravação incompleta.')
  } catch (e) {
    if (e instanceof ErroSessao || [400, 403, 404].includes(e.status)) throw e
    throw new ErroGravacaoIncerta('Não foi possível confirmar a gravação. Atualize os dados antes de fazer outra alteração; ela pode ter sido salva.', { cause: e })
  }
  const snapshot = atuais.map((r) => r.slice())
  for (const [campo, valor] of entries) snapshot[agora.posicao][agora.nomes.indexOf(campo)] = valor
  return { snapshot }
}
