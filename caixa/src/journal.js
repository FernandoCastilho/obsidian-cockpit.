// Estado por identidade. Este módulo nunca escolhe nem grava uma linha da fonte.
const LANCAMENTOS = ['lancamento_id', 'conta_id', 'pessoa_id', 'data', 'data_caixa', 'valor', 'descricao_original', 'descricao_limpa', 'subcategoria_id', 'tipo', 'status', 'parcela_n', 'parcela_total', 'recorrencia_id', 'par_transferencia_id', 'chave_dedup', 'importacao_id', 'revisado', 'obs']
const FIXAS = ['conta_fixa_id', 'descricao', 'subcategoria_id', 'pessoa_id', 'pagador', 'forma_pagamento', 'valor_padrao', 'valor_mes', 'dia_vencimento', 'pago', 'recorrencia_id', 'ativa', 'obs']
export const TABLES = {
  Lancamentos: { headers: LANCAMENTOS, idField: 'lancamento_id', editable: ['subcategoria_id', 'tipo', 'revisado'], width: 19, periodKind: 'all' },
  ContasFixas: { headers: FIXAS, idField: 'conta_fixa_id', editable: ['pago', 'valor_mes'], width: 13, periodKind: 'month' },
}
export const JOURNAL_TITLE = 'Caixa_Operacoes'
export const JOURNAL_HEADERS = ['operation_id', 'aba', 'registro_id', 'periodo', 'parent_operation_id', 'base_json', 'before_json', 'patch_json', 'after_json', 'created_at', 'schema_version', 'accepted', ...Array.from({ length: 19 }, (_, i) => `after_${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 19 }, (_, i) => `base_${String(i + 1).padStart(2, '0')}`)]
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const MODES = ['edit', 'keep_app', 'use_source']
const error = (code, message) => Object.assign(new Error(message), { code })
const invalid = () => error('JOURNAL_INVALID', 'O diário ou a estrutura da planilha está inconsistente. Não foi possível confirmar as alterações.')
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
const textId = (v) => typeof v === 'string' && v.trim() === v && v !== '' && !['undefined', 'null'].includes(v)
const own = (o, key) => Object.hasOwn(o, key)
const plain = (o) => o !== null && typeof o === 'object' && !Array.isArray(o) && [null, Object.prototype].includes(Object.getPrototypeOf(o))
const cell = (v) => {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) return v === 0 ? 0 : v
  throw invalid()
}
const row = (values, width, exact = false) => {
  if (!Array.isArray(values) || (exact && values.length !== width)) throw invalid()
  const cells = Array.from(values, cell)
  if (cells.slice(width).some((v) => v !== '')) throw invalid()
  return Array.from({ length: width }, (_, i) => cells[i] ?? '')
}
const specFor = (aba) => {
  if (!own(TABLES, aba)) throw error('INVALID_OPERATION', 'Tabela não permitida para gravação.')
  return TABLES[aba]
}
const dateOf = (now) => {
  const d = new Date(now)
  if (!Number.isFinite(d.getTime())) throw error('INVALID_OPERATION', 'Data de operação inválida.')
  return d
}
export function periodFor(aba, now = Date.now()) {
  const spec = specFor(aba)
  if (spec.periodKind === 'all') return '*'
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(dateOf(now))
  return `${parts.find((p) => p.type === 'year').value}-${parts.find((p) => p.type === 'month').value}`
}
export const recordKey = (aba, id, periodo) => JSON.stringify([aba, id, periodo])

// A primeira linha de dados usa um ramo sem intervalos de prefixo, evitando A2:A1.
// O prefixo é somente o diário reservado; ordenar a fonte não altera esta aceitação.
export function acceptanceFormula() {
  return '=IF(ROW()=2;INDIRECT("E"&ROW())="";LET(n;ROW();ids;INDIRECT("A$2:A"&(n-1));abas;INDIRECT("B$2:B"&(n-1));regs;INDIRECT("C$2:C"&(n-1));periodos;INDIRECT("D$2:D"&(n-1));aceitas;INDIRECT("L$2:L"&(n-1));AND(COUNTIF(ids;INDIRECT("A"&n))=0;IFERROR(LOOKUP(2;ARRAYFORMULA(1/(EXACT(abas;INDIRECT("B"&n))*EXACT(regs;INDIRECT("C"&n))*EXACT(periodos;INDIRECT("D"&n))*(aceitas=TRUE)));ids);"")=INDIRECT("E"&n))))'
}

function changesOf(changes, spec, allowEmpty = false) {
  if (!plain(changes)) throw error('INVALID_OPERATION', 'Alteração inválida.')
  const entries = Object.entries(changes)
  if ((!allowEmpty && !entries.length) || entries.some(([k]) => !spec.editable.includes(k))) throw error('INVALID_OPERATION', 'Campo não permitido para gravação.')
  for (const [key, value] of entries) {
    if (key === 'valor_mes') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw error('INVALID_OPERATION', 'Informe um valor válido.')
    } else if (key === 'pago' || key === 'revisado') {
      if (!['Sim', 'Não'].includes(value)) throw error('INVALID_OPERATION', 'Situação inválida para gravação.')
    } else if (key === 'tipo') {
      if (!['receita', 'despesa', 'transferencia', 'pagto_fatura', 'investimento', 'reembolso'].includes(value)) throw error('INVALID_OPERATION', 'Tipo de lançamento inválido.')
    } else if (!textId(value)) throw error('INVALID_OPERATION', 'Subcategoria inválida.')
  }
  return Object.fromEntries(entries)
}
function applyChanges(before, changes, spec) {
  const after = before.slice()
  for (const [key, value] of Object.entries(changes)) after[spec.headers.indexOf(key)] = value
  return after
}
function reconciled(base, before, mode, spec) {
  const after = base.slice()
  if (mode === 'keep_app') for (const key of spec.editable) after[spec.headers.indexOf(key)] = before[spec.headers.indexOf(key)]
  return after
}
export function reconciliationPreview(record, mode) {
  if (!record || !['keep_app', 'use_source'].includes(mode) || record.conflict !== 'source_changed' || !record.sourceRow || record.active === false) throw error('RECORD_CONFLICT', 'Não há uma nova versão da origem disponível para essa escolha.')
  const spec = specFor(record.aba)
  return reconciled(row(record.sourceRow, spec.width, true), row(record.row, spec.width, true), mode, spec)
}

function sourceOf(values, spec) {
  if (!Array.isArray(values) || !values.length || !same(row(values[0], spec.width), spec.headers)) throw invalid()
  const rows = [spec.headers.slice()]
  const byId = new Map()
  for (const raw of values.slice(1)) {
    const current = row(raw, spec.width)
    rows.push(current)
    if (current.every((v) => v === '')) continue
    const id = current[spec.headers.indexOf(spec.idField)]
    if (!textId(id) || byId.has(id)) throw invalid()
    byId.set(id, current)
  }
  return { rows, byId }
}
const jsonRow = (s, spec, id) => {
  if (typeof s !== 'string') throw invalid()
  let result
  try { result = row(JSON.parse(s), spec.width, true) } catch { throw invalid() }
  if (result[spec.headers.indexOf(spec.idField)] !== id) throw invalid()
  return result
}
function parseOperation(raw) {
  const values = row(raw, 50)
  const [operationId, aba, id, periodo, parent, baseJson, beforeJson, patchJson, afterJson, createdAt, schemaVersion, accepted] = values
  if (!UUID.test(operationId) || !own(TABLES, aba) || !textId(id) || (parent !== '' && !UUID.test(parent)) || schemaVersion !== 1) throw invalid()
  const spec = TABLES[aba]
  if (periodo !== '*' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) throw invalid()
  if ((spec.periodKind === 'all') !== (periodo === '*')) throw invalid()
  if (typeof createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) throw invalid()
  const base = jsonRow(baseJson, spec, id), before = jsonRow(beforeJson, spec, id), after = jsonRow(afterJson, spec, id)
  let patch
  try { patch = JSON.parse(patchJson) } catch { throw invalid() }
  if (!plain(patch) || Object.keys(patch).length !== 2 || !own(patch, 'mode') || !own(patch, 'changes') || !MODES.includes(patch.mode)) throw invalid()
  try { patch.changes = changesOf(patch.changes, spec, patch.mode !== 'edit') } catch { throw invalid() }
  if (patch.mode !== 'edit' && Object.keys(patch.changes).length) throw invalid()
  if (patch.mode === 'edit') {
    const expected = applyChanges(before, patch.changes, spec)
    if (!same(expected, after) || spec.headers.some((field, i) => !spec.editable.includes(field) && base[i] !== before[i])) throw invalid()
  } else if (!same(reconciled(base, before, patch.mode, spec), after)) throw invalid()
  if (!same(values.slice(12, 31), row(after, 19)) || !same(values.slice(31, 50), row(base, 19))) throw invalid()
  return { operationId, aba, id, periodo, parent, base, before, patch, after, createdAt, schemaVersion, accepted, values, key: recordKey(aba, id, periodo) }
}
function formulaAgrees(value, expected) {
  if (value === '' || value == null) throw error('JOURNAL_PENDING', 'A confirmação do diário ainda não está disponível. Atualize os dados.')
  if (typeof value !== 'boolean' || value !== expected) throw invalid()
}

export function replayJournal(rawTabs, journalValues, now = Date.now()) {
  if (!rawTabs || !Array.isArray(journalValues) || !journalValues.length || !same(row(journalValues[0], 50), JOURNAL_HEADERS)) throw invalid()
  const sources = Object.fromEntries(Object.entries(TABLES).map(([aba, spec]) => [aba, sourceOf(rawTabs[aba], spec)]))
  const periods = Object.fromEntries(Object.keys(TABLES).map((aba) => [aba, periodFor(aba, now)]))
  const records = Object.create(null), operations = Object.create(null), payloads = new Map(), history = new Map()
  for (const [aba, source] of Object.entries(sources)) for (const [id, current] of source.byId) {
    const periodo = periods[aba], key = recordKey(aba, id, periodo)
    records[key] = { aba, id, periodo, revision: '', base: current.slice(), row: current.slice(), sourceRow: current.slice(), conflict: null, sourceMissing: false, active: true }
  }
  for (const raw of journalValues.slice(1)) {
    const op = parseOperation(raw)
    const payload = JSON.stringify([...op.values.slice(0, 11), ...op.values.slice(12)])
    if (payloads.has(op.operationId)) {
      if (payloads.get(op.operationId) !== payload) throw invalid()
      formulaAgrees(op.accepted, false)
      operations[op.operationId].duplicate = true
      continue
    }
    payloads.set(op.operationId, payload)
    if (op.parent && (!operations[op.parent]?.accepted || operations[op.parent].recordKey !== op.key)) throw invalid()
    const previous = history.get(op.key)
    const accepted = op.parent === (previous?.revision ?? '')
    formulaAgrees(op.accepted, accepted)
    operations[op.operationId] = { accepted, duplicate: false, conflict: accepted ? null : 'revision_conflict', recordKey: op.key }
    if (!accepted) continue
    if (!previous) {
      if (op.patch.mode !== 'edit' || !same(op.before, op.base)) throw invalid()
    } else if (!same(op.before, previous.row) || (op.patch.mode === 'edit' && !same(op.base, previous.base))) throw invalid()
    const record = { aba: op.aba, id: op.id, periodo: op.periodo, revision: op.operationId, base: op.base.slice(), row: op.after.slice(), sourceRow: null, conflict: null, sourceMissing: false, active: op.periodo === periods[op.aba] }
    history.set(op.key, record)
    records[op.key] = record
  }
  const conflicts = []
  for (const [key, record] of Object.entries(records)) {
    const current = sources[record.aba].byId.get(record.id)
    record.sourceRow = current?.slice() ?? null
    record.sourceMissing = !current
    if (record.active && record.revision) {
      record.conflict = !current ? 'source_missing' : !same(current, record.base) ? 'source_changed' : null
      if (record.conflict) conflicts.push({ key, aba: record.aba, id: record.id, periodo: record.periodo, revision: record.revision, reason: record.conflict })
    }
  }
  for (const status of Object.values(operations)) if (status.accepted && records[status.recordKey]?.conflict) status.conflict = records[status.recordKey].conflict
  const tabs = { ...rawTabs }, canonicalRaw = { ...rawTabs }
  for (const [aba, source] of Object.entries(sources)) {
    const spec = TABLES[aba], idIndex = spec.headers.indexOf(spec.idField)
    canonicalRaw[aba] = source.rows.map((r) => r.slice())
    tabs[aba] = source.rows.map((r, i) => i === 0 ? r.slice() : (records[recordKey(aba, r[idIndex], periods[aba])]?.row ?? r).slice())
    for (const record of Object.values(records)) if (record.aba === aba && record.active && record.revision && record.sourceMissing) tabs[aba].push(record.row.slice())
  }
  return { tabs, records, operations, conflicts, rawTabs: canonicalRaw, periods }
}

export function prepareOperation(state, request, operationId, now = Date.now()) {
  if (!state || !plain(request) || !own(request, 'revision') || typeof request.revision !== 'string' || (request.revision !== '' && !UUID.test(request.revision)) || !UUID.test(operationId)) throw error('INVALID_OPERATION', 'Identidade ou versão de operação inválida. Atualize os dados.')
  const { aba, id, revision, mudancas, mode = 'edit' } = request
  const spec = specFor(aba), periodo = periodFor(aba, now)
  if (!textId(id) || !MODES.includes(mode) || own(request, 'range') || own(request, 'row')) throw error('INVALID_OPERATION', 'Pedido de alteração inválido.')
  if (state.periods?.[aba] !== periodo || (own(request, 'periodo') && request.periodo !== periodo)) throw error('PERIOD_CONFLICT', 'O período mudou. Atualize os dados antes de alterar a conta.')
  const key = recordKey(aba, id, periodo), record = state.records?.[key]
  if (!record || !record.active || !record.sourceRow || record.sourceMissing) throw error('RECORD_CONFLICT', 'O lançamento não está disponível na origem. Atualize os dados.')
  if (revision !== record.revision) throw error('REVISION_CONFLICT', 'Outro salvamento alterou este lançamento. Atualize os dados.')
  if (state.operations?.[operationId]) throw error('INVALID_OPERATION', 'Essa operação já consta do diário. Recupere a confirmação existente.')
  let changes, base, after
  if (mode === 'edit') {
    if (record.conflict) throw error('RECORD_CONFLICT', 'A origem mudou. Escolha como conciliar o lançamento antes de editar.')
    changes = changesOf(mudancas, spec)
    base = record.base.slice()
    after = applyChanges(record.row, changes, spec)
  } else {
    changes = changesOf(mudancas ?? {}, spec, true)
    if (Object.keys(changes).length) throw error('INVALID_OPERATION', 'A conciliação não aceita alterações adicionais.')
    base = record.sourceRow.slice()
    after = reconciliationPreview(record, mode)
  }
  const before = record.row.slice(), patch = { mode, changes }
  const operation = { operationId, aba, id, periodo, parent: revision, base, before, patch, after, createdAt: dateOf(now).toISOString(), schemaVersion: 1, key }
  const values = [operationId, aba, id, periodo, revision, JSON.stringify(base), JSON.stringify(before), JSON.stringify(patch), JSON.stringify(after), operation.createdAt, 1, acceptanceFormula(), ...row(after, 19), ...row(base, 19)]
  return { operation, values }
}
