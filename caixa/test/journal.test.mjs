import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { TABLES, JOURNAL_HEADERS, JOURNAL_TITLE, acceptanceFormula, periodFor, recordKey, replayJournal, prepareOperation, reconciliationPreview } from '../src/journal.js'

const NOW = Date.UTC(2026, 10, 2, 15)
const uid = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0')
const h = (aba) => TABLES[aba].headers
const ix = (aba, campo) => h(aba).indexOf(campo)
const clone = (v) => structuredClone(v)
function sourceRow(aba, id, values = {}) {
  const data = aba === 'Lancamentos'
    ? { lancamento_id: id, conta_id: 'CC', pessoa_id: 'P1', data: 46000, data_caixa: 46000, valor: -100, descricao_original: id, subcategoria_id: 'MOR-01', tipo: 'despesa', status: 'realizado', revisado: 'Não' }
    : { conta_fixa_id: id, descricao: id, subcategoria_id: 'MOR-01', pessoa_id: 'P1', valor_padrao: 100, valor_mes: 100, dia_vencimento: 10, pago: 'Não', ativa: 'Sim' }
  return h(aba).map((field) => ({ ...data, ...values })[field] ?? '')
}
function raw() {
  return {
    Lancamentos: [h('Lancamentos').slice(), sourceRow('Lancamentos', 'L-1'), sourceRow('Lancamentos', 'L-2')],
    ContasFixas: [h('ContasFixas').slice(), sourceRow('ContasFixas', 'CF-1'), sourceRow('ContasFixas', 'CF-2')],
    metaFixas: 1000,
  }
}
const log = (...events) => [JOURNAL_HEADERS.slice(), ...events]
const replay = (tabs, events = [], now = NOW) => replayJournal(tabs, log(...events), now)
const key = (aba = 'ContasFixas', id = 'CF-1', period = '2026-11') => recordKey(aba, id, period)
const request = (revision = '', extra = {}) => ({ aba: 'ContasFixas', id: 'CF-1', revision, mudancas: { pago: 'Sim' }, ...extra })
const prep = (state, n, extra = {}) => prepareOperation(state, request('', extra), uid(n), NOW)
const confirmed = (prepared, accepted = true) => { const values = clone(prepared.values); values[11] = accepted; return values }

test('contrato: 50 colunas, tipos de tabela e período de Brasília', () => {
  assert.equal(JOURNAL_TITLE, 'Caixa_Operacoes')
  assert.equal(JOURNAL_HEADERS.length, 50)
  assert.equal(TABLES.Lancamentos.headers.length, 19)
  assert.equal(TABLES.ContasFixas.headers.length, 13)
  assert.equal(JOURNAL_HEADERS[11], 'accepted')
  assert.equal(JOURNAL_HEADERS[12], 'after_01')
  assert.equal(JOURNAL_HEADERS[31], 'base_01')
  assert.equal(periodFor('Lancamentos', NOW), '*')
  assert.equal(periodFor('ContasFixas', '2026-11-01T02:59:59Z'), '2026-10')
  assert.equal(periodFor('ContasFixas', '2026-11-01T03:00:00Z'), '2026-11')
  assert.ok(acceptanceFormula().startsWith('=IF(ROW()=2;'))
  assert.match(acceptanceFormula(), /ARRAYFORMULA\(1\/\(/)
  assert.equal((acceptanceFormula().match(/EXACT\(/g) ?? []).length, 3)
})
test('consulta sem eventos preserva a fonte e não altera os argumentos', () => {
  const tabs = raw(), original = clone(tabs), state = replay(tabs)
  assert.deepEqual(state.tabs, tabs)
  assert.deepEqual(tabs, original)
  assert.notEqual(state.tabs.ContasFixas, tabs.ContasFixas)
  assert.equal(state.records[key()].revision, '')
  assert.deepEqual(state.conflicts, [])
})
test('operação válida cria patch único, mantém tipos e não toca a fonte', () => {
  const tabs = raw(), state = replay(tabs), before = clone(tabs)
  const p = prep(state, 1, { mudancas: { pago: 'Sim', valor_mes: 120 } })
  assert.equal(p.values.length, 50)
  assert.equal(p.values[11], acceptanceFormula())
  const result = replay(tabs, [confirmed(p)])
  assert.equal(result.records[key()].revision, uid(1))
  assert.equal(result.tabs.ContasFixas[1][ix('ContasFixas', 'pago')], 'Sim')
  assert.equal(result.tabs.ContasFixas[1][ix('ContasFixas', 'valor_mes')], 120)
  assert.deepEqual(tabs, before)
  assert.equal(result.operations[uid(1)].accepted, true)
})
for (const movement of ['ordenar', 'inserir']) test('a fonte pode ' + movement + ' entre preparar e confirmar sem atingir outro ID', () => {
  const tabs = raw(), p = prep(replay(tabs), 2)
  if (movement === 'ordenar') tabs.ContasFixas = [tabs.ContasFixas[0], tabs.ContasFixas[2], tabs.ContasFixas[1]]
  else tabs.ContasFixas.splice(1, 0, sourceRow('ContasFixas', 'CF-NOVA'))
  const state = replay(tabs, [confirmed(p)])
  const byId = new Map(state.tabs.ContasFixas.slice(1).map((r) => [r[0], r]))
  assert.equal(byId.get('CF-1')[ix('ContasFixas', 'pago')], 'Sim')
  assert.equal(byId.get('CF-2')[ix('ContasFixas', 'pago')], 'Não')
  assert.equal(state.records[key()].conflict, null)
})
test('duas operações com mesma revisão: só a primeira aceita, sem sobrescrever', () => {
  const tabs = raw(), initial = replay(tabs)
  const a = prep(initial, 3, { mudancas: { valor_mes: 120 } })
  const b = prep(initial, 4, { mudancas: { valor_mes: 150 } })
  const state = replay(tabs, [confirmed(a), confirmed(b, false)])
  assert.equal(state.records[key()].row[ix('ContasFixas', 'valor_mes')], 120)
  assert.equal(state.operations[uid(4)].accepted, false)
  assert.equal(state.operations[uid(4)].conflict, 'revision_conflict')
  assert.throws(() => replay(tabs, [confirmed(a), confirmed(b, true)]), { code: 'JOURNAL_INVALID' })
})
test('IDs que diferem só em caixa continuam identidades distintas', () => {
  const tabs = raw()
  tabs.ContasFixas = [h('ContasFixas').slice(), sourceRow('ContasFixas', 'abc'), sourceRow('ContasFixas', 'ABC')]
  const state = replay(tabs)
  const a = prep(state, 5, { id: 'abc' }), b = prep(state, 6, { id: 'ABC' })
  const result = replay(tabs, [confirmed(a), confirmed(b)])
  assert.equal(result.records[key('ContasFixas', 'abc')].revision, uid(5))
  assert.equal(result.records[key('ContasFixas', 'ABC')].revision, uid(6))
})
test('segunda edição exige explicitamente a revisão confirmada', () => {
  const tabs = raw(), a = prep(replay(tabs), 7), state = replay(tabs, [confirmed(a)])
  assert.throws(() => prep(state, 8), { code: 'REVISION_CONFLICT' })
  const b = prep(state, 8, { revision: uid(7), mudancas: { valor_mes: 125 } })
  const result = replay(tabs, [confirmed(a), confirmed(b)])
  assert.equal(result.records[key()].revision, uid(8))
  assert.equal(result.records[key()].row[ix('ContasFixas', 'pago')], 'Sim')
})
test('repetição idêntica é idempotente; mesmo UUID com conteúdo diferente invalida', () => {
  const tabs = raw(), a = prep(replay(tabs), 9)
  const first = confirmed(a), duplicate = confirmed(a, false)
  const state = replay(tabs, [first, duplicate])
  assert.equal(state.operations[uid(9)].accepted, true)
  assert.equal(state.operations[uid(9)].duplicate, true)
  const changed = clone(duplicate); changed[9] = '2026-11-02T16:00:00.000Z'
  assert.throws(() => replay(tabs, [first, changed]), { code: 'JOURNAL_INVALID' })
  assert.throws(() => prep(state, 9, { revision: uid(9) }), { code: 'INVALID_OPERATION' })
})
for (const value of ['', null, undefined]) test('fórmula sem resultado (' + String(value) + ') não confirma', () => {
  const tabs = raw(), a = prep(replay(tabs), 10), values = confirmed(a)
  values[11] = value
  assert.throws(() => replay(tabs, [values]), { code: 'JOURNAL_PENDING' })
})
test('divergência entre fórmula e reducer não confirma sucesso', () => {
  const tabs = raw(), a = prep(replay(tabs), 11)
  assert.throws(() => replay(tabs, [confirmed(a, false)]), { code: 'JOURNAL_INVALID' })
  const wrongType = confirmed(a); wrongType[11] = 'TRUE'
  assert.throws(() => replay(tabs, [wrongType]), { code: 'JOURNAL_INVALID' })
})
test('fonte alterada mantém snapshot confirmado e exige conciliação explícita', () => {
  const tabs = raw(), a = prep(replay(tabs), 12)
  tabs.ContasFixas[1][ix('ContasFixas', 'descricao')] = 'Descrição nova da origem'
  tabs.ContasFixas[1][ix('ContasFixas', 'valor_padrao')] = 999
  tabs.ContasFixas[1][ix('ContasFixas', 'valor_mes')] = 180
  const state = replay(tabs, [confirmed(a)]), record = state.records[key()]
  assert.equal(record.row[ix('ContasFixas', 'descricao')], 'CF-1')
  assert.equal(record.row[ix('ContasFixas', 'pago')], 'Sim')
  assert.equal(record.sourceRow[ix('ContasFixas', 'valor_mes')], 180)
  assert.equal(record.conflict, 'source_changed')
  assert.equal(state.operations[uid(12)].conflict, 'source_changed')
  assert.throws(() => prep(state, 13, { revision: uid(12) }), { code: 'RECORD_CONFLICT' })
  const preview = reconciliationPreview(record, 'keep_app')
  assert.equal(preview[ix('ContasFixas', 'descricao')], 'Descrição nova da origem')
  assert.equal(preview[ix('ContasFixas', 'valor_padrao')], 999)
  assert.equal(preview[ix('ContasFixas', 'valor_mes')], 100)
  assert.equal(preview[ix('ContasFixas', 'pago')], 'Sim')
  const keep = prep(state, 13, { revision: uid(12), mode: 'keep_app', mudancas: undefined })
  assert.deepEqual(keep.operation.after, preview)
  assert.deepEqual(keep.operation.base, record.sourceRow)
  const result = replay(tabs, [confirmed(a), confirmed(keep)])
  assert.equal(result.records[key()].conflict, null)
  assert.deepEqual(result.records[key()].row, preview)
})
test('usar origem cria geração sem apagar a operação anterior', () => {
  const tabs = raw(), a = prep(replay(tabs), 14)
  tabs.ContasFixas[1][ix('ContasFixas', 'valor_mes')] = 180
  const state = replay(tabs, [confirmed(a)])
  const preview = reconciliationPreview(state.records[key()], 'use_source')
  const useSource = prep(state, 15, { revision: uid(14), mode: 'use_source', mudancas: {} })
  const result = replay(tabs, [confirmed(a), confirmed(useSource)])
  assert.equal(result.operations[uid(14)].accepted, true)
  assert.equal(result.operations[uid(15)].accepted, true)
  assert.deepEqual(result.records[key()].row, preview)
  assert.equal(result.records[key()].conflict, null)
})
test('origem muda após preparar conciliação: preserva snapshot e sinaliza conflito', () => {
  const tabs = raw(), a = prep(replay(tabs), 16)
  tabs.ContasFixas[1][ix('ContasFixas', 'valor_mes')] = 180
  const state = replay(tabs, [confirmed(a)])
  const b = prep(state, 17, { revision: uid(16), mode: 'use_source', mudancas: {} })
  tabs.ContasFixas[1][ix('ContasFixas', 'valor_mes')] = 190
  const result = replay(tabs, [confirmed(a), confirmed(b)])
  assert.equal(result.records[key()].row[ix('ContasFixas', 'valor_mes')], 180)
  assert.equal(result.records[key()].sourceRow[ix('ContasFixas', 'valor_mes')], 190)
  assert.equal(result.operations[uid(17)].accepted, true)
  assert.equal(result.operations[uid(17)].conflict, 'source_changed')
})
test('fonte excluída mantém confirmação visível e bloqueia edição/conciliação', () => {
  const tabs = raw(), a = prep(replay(tabs), 18)
  tabs.ContasFixas.splice(1, 1)
  const state = replay(tabs, [confirmed(a)]), record = state.records[key()]
  assert.equal(record.sourceRow, null)
  assert.equal(record.conflict, 'source_missing')
  assert.equal(state.tabs.ContasFixas.find((r) => r[0] === 'CF-1')[ix('ContasFixas', 'pago')], 'Sim')
  assert.throws(() => prep(state, 19, { revision: uid(18) }), { code: 'RECORD_CONFLICT' })
  assert.throws(() => reconciliationPreview(record, 'keep_app'), { code: 'RECORD_CONFLICT' })
})
for (const kind of ['duplicado', 'vazio', 'numérico', 'cabeçalho', 'célula extra', 'tipo inválido']) test('fonte inválida: ' + kind, () => {
  const tabs = raw()
  if (kind === 'duplicado') tabs.ContasFixas.push(clone(tabs.ContasFixas[1]))
  if (kind === 'vazio') tabs.ContasFixas[1][0] = ''
  if (kind === 'numérico') tabs.ContasFixas[1][0] = 1
  if (kind === 'cabeçalho') tabs.ContasFixas[0][1] = 'outro'
  if (kind === 'célula extra') tabs.ContasFixas[1].push('extra')
  if (kind === 'tipo inválido') tabs.ContasFixas[1][1] = {}
  assert.throws(() => replay(tabs), { code: 'JOURNAL_INVALID' })
})
for (const kind of ['cabeçalho', 'linha vazia', 'pai ausente', 'tipos divergentes', 'JSON inválido']) test('diário inválido: ' + kind, () => {
  const tabs = raw(), a = prep(replay(tabs), 20), values = confirmed(a), journal = log(values)
  if (kind === 'cabeçalho') journal[0][0] = 'outro'
  if (kind === 'linha vazia') journal.push([])
  if (kind === 'pai ausente') values[4] = uid(999)
  if (kind === 'tipos divergentes') values[12 + ix('ContasFixas', 'valor_mes')] = '100'
  if (kind === 'JSON inválido') values[5] = '{'
  assert.throws(() => replayJournal(tabs, journal, NOW), { code: 'JOURNAL_INVALID' })
})
test('UUIDs são globais e chave do registro não colide por separadores', () => {
  assert.notEqual(recordKey('A', 'B|C', '*'), recordKey('A|B', 'C', '*'))
  const tabs = raw(), state = replay(tabs), a = prep(state, 21), b = prep(state, 21, { id: 'CF-2' })
  assert.throws(() => replay(tabs, [confirmed(a), confirmed(b, false)]), { code: 'JOURNAL_INVALID' })
})
test('passagem do mês isola histórico sem inventar reset da fonte', () => {
  const tabs = raw(), october = '2026-10-31T15:00:00.000Z'
  const oldState = replay(tabs, [], october)
  const oldOp = prepareOperation(oldState, request('', { periodo: '2026-10' }), uid(22), october)
  const state = replay(tabs, [confirmed(oldOp)], NOW)
  assert.equal(state.records[key('ContasFixas', 'CF-1', '2026-10')].active, false)
  assert.equal(state.records[key()].revision, '')
  assert.equal(state.records[key()].row[ix('ContasFixas', 'pago')], 'Não')
  assert.deepEqual(state.conflicts, [])
  assert.throws(() => prepareOperation(oldState, request(), uid(23), NOW), { code: 'PERIOD_CONFLICT' })
  assert.throws(() => prep(state, 23, { periodo: '2026-10' }), { code: 'PERIOD_CONFLICT' })
  const next = prep(state, 23, { periodo: '2026-11' })
  assert.equal(replay(tabs, [confirmed(oldOp), confirmed(next)], NOW).records[key()].revision, uid(23))
  const paidSource = raw(); paidSource.ContasFixas[1][ix('ContasFixas', 'pago')] = 'Sim'
  assert.equal(replay(paidSource).records[key()].row[ix('ContasFixas', 'pago')], 'Sim')
})
for (const [name, extra] of [
  ['sem versão', { revision: undefined }],
  ['campo proibido', { mudancas: { descricao: 'outro' } }],
  ['valor não finito', { mudancas: { valor_mes: NaN } }],
  ['valor como texto', { mudancas: { valor_mes: '120' } }],
  ['situação inválida', { mudancas: { pago: true } }],
  ['endereço A1', { range: 'ContasFixas!J2' }],
  ['número da linha', { row: 2 }],
  ['modo desconhecido', { mode: 'outro' }],
]) test('pedido recusado antes de gerar append: ' + name, () => {
  assert.throws(() => prep(replay(raw()), 24, extra), { code: 'INVALID_OPERATION' })
})
test('fixture nativo prende literal homologado e resultado do reducer', async () => {
  // Mudança da fórmula exige renovar o ensaio nativo, não só editar o fixture.
  const fixture = JSON.parse(await readFile(new URL('./fixtures/native-journal.json', import.meta.url), 'utf8'))
  assert.equal(acceptanceFormula(), fixture.acceptanceFormula)
  assert.deepEqual(fixture.journalValues.slice(1).map((r) => r[11]), fixture.expected.accepted)
  assert.deepEqual(fixture.rawTabs.ContasFixas.slice(1).map((r) => r[0]), fixture.expected.sourceOrder)
  const state = replayJournal(fixture.rawTabs, fixture.journalValues, fixture.now)
  const period = periodFor('ContasFixas', fixture.now)
  const energy = state.records[recordKey('ContasFixas', 'F-ENERGIA', period)]
  const internet = state.records[recordKey('ContasFixas', 'F-INTERNET', period)]
  assert.equal(energy.row[ix('ContasFixas', 'valor_mes')], fixture.expected.energy.valor_mes)
  assert.equal(energy.row[ix('ContasFixas', 'pago')], fixture.expected.energy.pago)
  assert.equal(energy.conflict, null)
  assert.equal(internet.row[ix('ContasFixas', 'valor_mes')], fixture.expected.internet.valor_mes)
  assert.equal(internet.row[ix('ContasFixas', 'pago')], fixture.expected.internet.pago)
  assert.equal(internet.conflict, fixture.expected.internet.conflict)
})
