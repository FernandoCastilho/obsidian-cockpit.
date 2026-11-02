// Ações do Caixa só acrescentam eventos ao diário reservado. Nunca escolhem
// nem atualizam o endereço de uma linha nas abas que alimentam o aplicativo.
import { JOURNAL_HEADERS, JOURNAL_TITLE, TABLES, periodFor, prepareOperation, recordKey, replayJournal } from './journal.js'

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const RANGES = ['Pessoas', 'Contas', 'Categorias', 'Subcategorias', 'Lancamentos!A:S', 'ContasFixas!A:M', 'ContasFixas!P6']
const NOMES = ['Pessoas', 'Contas', 'Categorias', 'Subcategorias', 'Lancamentos', 'ContasFixas', 'metaFixas']
const RENDER = 'valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER'
const ID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export const PENDING_PREFIX = 'caixa:pending:'

export class ErroSessao extends Error {}
export class ErroConflito extends Error {}
export class ErroGravacaoIncerta extends Error {}
export class ErroConfiguracao extends Error {}

const conflito = () => new ErroConflito('Os dados deste lançamento mudaram. Atualize os dados e revise antes de salvar.')
const configuracao = () => new ErroConfiguracao('O diário do Caixa não está íntegro ou disponível. A gravação foi bloqueada; atualize os dados.')
const incerta = (operationId, cause) => Object.assign(new ErroGravacaoIncerta('Não foi possível confirmar a gravação. Atualize os dados para recuperar a confirmação, sem repetir o envio.', { cause }), { operationId })
const own = (o, key) => Object.hasOwn(o, key)

function validarAcesso(token, sheetId) {
  if (typeof token !== 'string' || !token.trim()) throw new ErroSessao('Sua sessão expirou. Entre de novo.')
  if (typeof sheetId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(sheetId)) throw configuracao()
}

async function chamar(token, url, opcoes = {}) {
  const resposta = await fetch(url, { ...opcoes, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
  if (resposta.status === 401) throw new ErroSessao('Sua sessão expirou. Entre de novo.')
  if (!resposta.ok) {
    const erro = new Error(resposta.status === 403 ? 'Sem permissão nesta planilha. Peça acesso de edição no Drive.' : `Falha ao falar com o Google (${resposta.status}).`)
    erro.status = resposta.status
    throw erro
  }
  return resposta.json()
}

export function pendingOperationId(sheetId) {
  try {
    const id = globalThis.sessionStorage?.getItem(`${PENDING_PREFIX}${sheetId}`)
    return typeof id === 'string' && id ? id : null
  } catch { return null }
}

// Escolha explícita da pessoa: não apaga eventos, não repete a gravação e não
// afirma que uma solicitação pendente tenha sido cancelada no servidor.
export function esquecerPendencia(sheetId, expectedId) {
  try {
    const atual = pendingOperationId(sheetId)
    if (!atual || (expectedId !== undefined && expectedId !== atual)) return false
    globalThis.sessionStorage.removeItem(`${PENDING_PREFIX}${sheetId}`)
    return pendingOperationId(sheetId) === null
  } catch { return false }
}

function guardarPendencia(sheetId, operationId) {
  const anterior = pendingOperationId(sheetId)
  if (anterior && anterior !== operationId) throw incerta(anterior)
  try {
    if (!globalThis.sessionStorage) throw new Error('Confirmação local indisponível.')
    globalThis.sessionStorage.setItem(`${PENDING_PREFIX}${sheetId}`, operationId)
    if (pendingOperationId(sheetId) !== operationId) throw new Error('Confirmação local indisponível.')
  } catch (e) {
    throw new ErroConfiguracao('Não foi possível preparar a confirmação. Nenhuma gravação foi enviada. Reabra o Caixa antes de tentar salvar.', { cause: e })
  }
}

function erroNucleo(e) {
  if (['RECORD_CONFLICT', 'REVISION_CONFLICT', 'PERIOD_CONFLICT'].includes(e?.code)) return Object.assign(conflito(), { code: e.code, cause: e })
  if (e?.code === 'INVALID_OPERATION') return Object.assign(new ErroConflito(e.message || 'Operação inválida. Atualize os dados.'), { code: e.code, cause: e })
  return Object.assign(configuracao(), { code: e?.code, cause: e })
}

async function descobrirDiario(token, sheetId) {
  const campos = 'sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))'
  const j = await chamar(token, `${BASE}/${sheetId}?fields=${encodeURIComponent(campos)}`)
  if (!Array.isArray(j?.sheets)) throw configuracao()
  const encontrados = j.sheets.filter((s) => s?.properties?.title === JOURNAL_TITLE)
  if (encontrados.length > 1) throw configuracao()
  if (!encontrados.length) return null
  const p = encontrados[0].properties
  if (!Number.isInteger(p.sheetId) || p.sheetId < 0 || !Number.isInteger(p.gridProperties?.rowCount) || p.gridProperties.rowCount < 1 || !Number.isInteger(p.gridProperties?.columnCount) || p.gridProperties.columnCount < JOURNAL_HEADERS.length) throw configuracao()
  return p.sheetId
}

async function lerEstado(token, sheetId, journalSheetId, now) {
  const ranges = journalSheetId === null ? RANGES : [...RANGES, `${JOURNAL_TITLE}!A:AX`]
  const query = ranges.map((range) => `ranges=${encodeURIComponent(range)}`).join('&')
  const j = await chamar(token, `${BASE}/${sheetId}/values:batchGet?${query}&${RENDER}`)
  if (!Array.isArray(j?.valueRanges) || j.valueRanges.length !== ranges.length) throw configuracao()
  const rawTabs = Object.fromEntries(NOMES.map((nome, i) => {
    const values = j.valueRanges[i]?.values ?? []
    if (!Array.isArray(values)) throw configuracao()
    return [nome, values]
  }))
  rawTabs.metaFixas = rawTabs.metaFixas?.[0]?.[0] ?? 0
  const journal = journalSheetId === null ? [JOURNAL_HEADERS] : (j.valueRanges.at(-1)?.values ?? [])
  return replayJournal(rawTabs, journal, now)
}

function comMetadados(state, journalSheetId, sheetId) {
  const pending = pendingOperationId(sheetId)
  const outcome = pending ? state.operations[pending] : null
  const pendingStatus = pending ? (outcome ? (outcome.accepted && !outcome.conflict ? 'accepted' : 'conflict') : 'pending') : null
  if (pending && pendingStatus !== 'pending') esquecerPendencia(sheetId, pending)
  return {
    ...state.tabs,
    _caixa: {
      configured: journalSheetId !== null,
      journalSheetId,
      state,
      records: state.records,
      operations: state.operations,
      conflicts: state.conflicts,
      periods: state.periods,
      pendingOperationId: pending,
      pendingStatus,
      configurationMessage: journalSheetId === null ? 'O diário não está disponível. Esta consulta mostra somente a base da planilha; as gravações estão bloqueadas.' : null,
    },
  }
}

// A recuperação de fórmulas pendentes só repete leitura. Jamais repete append.
export async function carregar(token, sheetId, { now = Date.now() } = {}) {
  validarAcesso(token, sheetId)
  const journalSheetId = await descobrirDiario(token, sheetId)
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const state = await lerEstado(token, sheetId, journalSheetId, now)
      return comMetadados(state, journalSheetId, sheetId)
    } catch (e) {
      if (e?.code === 'JOURNAL_PENDING' && tentativa < 2) {
        await new Promise((resolve) => setTimeout(resolve, tentativa === 0 ? 150 : 400))
        continue
      }
      if (e?.code) throw erroNucleo(e)
      throw e
    }
  }
  throw configuracao()
}

export const recuperarPendencia = (token, sheetId, opcoes) => carregar(token, sheetId, opcoes)

function canonica(values, width) {
  if (!Array.isArray(values)) throw conflito()
  const cells = Array.from(values, (v) => v == null ? '' : v)
  if (cells.slice(width).some((v) => v !== '') || cells.some((v) => !['string', 'boolean', 'number'].includes(typeof v) || (typeof v === 'number' && !Number.isFinite(v)))) throw conflito()
  return Array.from({ length: width }, (_, i) => cells[i] ?? '')
}

const iguais = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i])

function registroEsperado(esperado, aba, id) {
  const spec = own(TABLES, aba) ? TABLES[aba] : null
  if (!spec || !Array.isArray(esperado) || !iguais(canonica(esperado[0], spec.headers.length), spec.headers)) throw conflito()
  const indexId = spec.headers.indexOf(spec.idField)
  const rows = esperado.slice(1).map((v) => canonica(v, spec.headers.length))
  const encontrados = rows.filter((v) => v[indexId] === id)
  if (encontrados.length !== 1) throw conflito()
  return encontrados[0]
}

function tipar(values) {
  if (!Array.isArray(values) || values.length !== JOURNAL_HEADERS.length) throw configuracao()
  return values.map((valor, i) => {
    if (i === 11) {
      if (typeof valor !== 'string' || !valor.startsWith('=')) throw configuracao()
      return { userEnteredValue: { formulaValue: valor } }
    }
    if (valor == null || typeof valor === 'string') return { userEnteredValue: { stringValue: valor ?? '' } }
    if (typeof valor === 'boolean') return { userEnteredValue: { boolValue: valor } }
    if (typeof valor === 'number' && Number.isFinite(valor)) return { userEnteredValue: { numberValue: valor } }
    throw configuracao()
  })
}

function pedidoImutavel(pedido, now) {
  const { aba, id, revision, periodo, esperado, mudancas, mode = 'edit', fonteEsperada } = pedido ?? {}
  if (!own(TABLES, aba) || typeof id !== 'string' || !id.trim() || id !== id.trim() || typeof revision !== 'string' || typeof periodo !== 'string' || !['edit', 'keep_app', 'use_source'].includes(mode)) throw conflito()
  if (periodo !== periodFor(aba, now)) throw new ErroConflito('O período do lançamento mudou. Atualize os dados antes de salvar.')
  const before = registroEsperado(esperado, aba, id)
  const source = mode === 'edit' ? null : canonica(fonteEsperada, TABLES[aba].headers.length)
  if (!mudancas || typeof mudancas !== 'object' || Array.isArray(mudancas)) throw conflito()
  const changes = Object.fromEntries(Object.entries(mudancas))
  return { aba, id, revision, periodo, mode, mudancas: changes, before, source }
}

export async function gravarRegistro(token, sheetId, pedido, { now = Date.now(), operationId = globalThis.crypto?.randomUUID?.() } = {}) {
  validarAcesso(token, sheetId)
  const intent = pedidoImutavel(pedido, now)
  if (typeof operationId !== 'string' || !ID_VALIDO.test(operationId)) throw configuracao()
  let tabs
  try { tabs = await carregar(token, sheetId, { now }) } catch (e) {
    if (e instanceof ErroSessao || e instanceof ErroConfiguracao || e.status === 403) throw e
    throw new Error('Não foi possível conferir os dados. Nenhuma gravação foi enviada. Atualize os dados e tente novamente.', { cause: e })
  }
  const meta = tabs._caixa
  if (!meta.configured) throw configuracao()
  if (meta.pendingStatus === 'pending') throw incerta(meta.pendingOperationId)
  const key = recordKey(intent.aba, intent.id, intent.periodo)
  const current = meta.records[key]
  if (!current || !iguais(intent.before, current.row) || (intent.mode !== 'edit' && !iguais(intent.source, current.sourceRow))) throw conflito()
  let prepared
  try {
    prepared = prepareOperation(meta.state, {
      aba: intent.aba, id: intent.id, revision: intent.revision, periodo: intent.periodo, mudancas: intent.mudancas, mode: intent.mode,
    }, operationId, now)
  } catch (e) { throw erroNucleo(e) }
  const values = tipar(prepared.values)
  guardarPendencia(sheetId, operationId)
  try {
    const r = await chamar(token, `${BASE}/${sheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: [{ appendCells: { sheetId: meta.journalSheetId, rows: [{ values }], fields: 'userEnteredValue' } }] }),
    })
    if (r?.spreadsheetId !== sheetId || !Array.isArray(r.replies) || r.replies.length !== 1) throw new Error('Confirmação de recebimento incompleta.')
  } catch (e) {
    if (e instanceof ErroSessao || [400, 403, 404].includes(e.status)) {
      esquecerPendencia(sheetId, operationId)
      throw e
    }
    throw incerta(operationId, e)
  }
  let confirmed
  try { confirmed = await carregar(token, sheetId, { now }) } catch (e) {
    // Mesmo 401 na releitura não prova falha da escrita já enviada.
    if (e instanceof ErroSessao) throw Object.assign(e, { operationId, confirmationPending: true })
    throw incerta(operationId, e)
  }
  const result = confirmed._caixa.operations[operationId]
  if (!result) throw incerta(operationId)
  esquecerPendencia(sheetId, operationId)
  if (!result.accepted || result.conflict) throw Object.assign(new ErroConflito('A alteração entrou em conflito com outra mudança. Atualize os dados e revise o lançamento.'), { operationId, tabs: confirmed })
  return { tabs: confirmed, operationId }
}
