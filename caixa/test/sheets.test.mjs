import test from 'node:test'
import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { carregar, gravarRegistro, recuperarPendencia, ErroConfiguracao, ErroConflito, ErroGravacaoIncerta, ErroSessao } from '../src/sheets.js'
import { JOURNAL_HEADERS, recordKey } from '../src/journal.js'

const NOW = Date.UTC(2026, 10, 2, 15), SHEET = 'PLANILHA_FICTICIA', JOURNAL_ID = 77
const IDS = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222']
const clone = (v) => structuredClone(v)
const LH = ['lancamento_id', 'conta_id', 'pessoa_id', 'data', 'data_caixa', 'valor', 'descricao_original', 'descricao_limpa', 'subcategoria_id', 'tipo', 'status', 'parcela_n', 'parcela_total', 'recorrencia_id', 'par_transferencia_id', 'chave_dedup', 'importacao_id', 'revisado', 'obs']
const FH = ['conta_fixa_id', 'descricao', 'subcategoria_id', 'pessoa_id', 'pagador', 'forma_pagamento', 'valor_padrao', 'valor_mes', 'dia_vencimento', 'pago', 'recorrencia_id', 'ativa', 'obs']
const row = (headers, values) => headers.map((key) => values[key] ?? '')
const dados = () => ({
  Pessoas: [['pessoa_id', 'nome', 'ativa'], ['FAM', 'Família fictícia', 'Sim']],
  Contas: [['conta_id', 'pessoa_id', 'apelido', 'tipo', 'entra_no_fechamento'], ['CC', 'FAM', 'Conta fictícia', 'corrente', 'Sim']],
  Categorias: [['categoria_id', 'nome', 'tipo', 'ordem'], ['MOR', 'Moradia', 'despesa', 1]],
  Subcategorias: [['subcategoria_id', 'categoria_id', 'nome', 'ativa'], ['MOR-01', 'MOR', 'Energia', 'Sim']],
  Lancamentos: [LH,
    row(LH, { lancamento_id: 'L1', conta_id: 'CC', pessoa_id: 'FAM', data: 46328, data_caixa: 46328, valor: -100, descricao_original: 'Energia', subcategoria_id: 'SEM-01', tipo: 'despesa', status: 'realizado', revisado: 'Não' }),
    row(LH, { lancamento_id: 'L2', conta_id: 'CC', pessoa_id: 'FAM', data: 46329, data_caixa: 46329, valor: -80, descricao_original: 'Internet', subcategoria_id: 'SEM-01', tipo: 'despesa', status: 'realizado', revisado: 'Não' }),
  ],
  ContasFixas: [FH,
    row(FH, { conta_fixa_id: 'F1', descricao: 'Energia', subcategoria_id: 'MOR-01', pessoa_id: 'FAM', forma_pagamento: 'boleto', valor_padrao: 100, valor_mes: 100, dia_vencimento: 5, pago: 'Não', ativa: 'Sim' }),
    row(FH, { conta_fixa_id: 'F2', descricao: 'Internet', subcategoria_id: 'MOR-02', pessoa_id: 'FAM', forma_pagamento: 'boleto', valor_padrao: 80, valor_mes: 80, dia_vencimento: 10, pago: 'Não', ativa: 'Sim' }),
  ],
  metaFixas: 1000,
})
const response = (status, body = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => clone(body) })

// Nenhuma chamada sai para a rede. O serviço calcula a aceitação independentemente
// do reducer: a tupla exige o último parent aceito, e operation_id só entra uma vez.
function rede(t, options = {}) {
  const originalFetch = globalThis.fetch
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  const clients = new AsyncLocalStorage(), stores = new Map()
  const storage = () => { const name = clients.getStore() ?? 'default'; if (!stores.has(name)) stores.set(name, new Map()); return stores.get(name) }
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: (key) => storage().get(String(key)) ?? null,
    setItem: (key, value) => { if (options.storageFailure) throw new Error('Armazenamento indisponível'); storage().set(String(key), String(value)) },
    removeItem: (key) => storage().delete(String(key)),
  } })
  const s = {
    tabs: clone(options.tabs ?? dados()), journal: clone(options.journal ?? [JOURNAL_HEADERS]), calls: [], valuesReads: 0, appends: 0,
    client: (name, fn) => clients.run(name, fn), stored: (name = 'default') => [...(stores.get(name)?.values() ?? [])],
    posts: () => s.calls.filter((c) => c.method === 'POST'),
  }
  const decode = (cell, index) => {
    const v = cell?.userEnteredValue ?? {}
    if ('formulaValue' in v) { assert.equal(index, 11, 'fórmula apenas em L'); assert.match(v.formulaValue, /^=/); return null }
    for (const key of ['stringValue', 'numberValue', 'boolValue']) if (key in v) return v[key]
    return ''
  }
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url)), c = { url: String(url), method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : null }
    s.calls.push(c)
    assert.equal(u.origin, 'https://sheets.googleapis.com')
    if (c.method === 'GET' && !u.pathname.endsWith('/values:batchGet')) {
      if (options.metadataStatus) return response(options.metadataStatus)
      const sheets = Object.keys(s.tabs).filter((name) => name !== 'metaFixas').map((title, i) => ({ properties: { title, sheetId: i + 1, gridProperties: { rowCount: 1000, columnCount: 30 } } }))
      if (!options.missingJournal) sheets.push({ properties: { title: 'Caixa_Operacoes', sheetId: JOURNAL_ID, gridProperties: { rowCount: options.journalRows ?? 1000, columnCount: options.journalColumns ?? 50 } } })
      return response(200, { spreadsheetId: SHEET, sheets })
    }
    if (c.method === 'GET') {
      s.valuesReads++
      if (options.readFailure) throw options.readFailure
      await options.beforeRead?.(s, s.valuesReads)
      const valueRanges = u.searchParams.getAll('ranges').map((range) => {
        const clean = range.replaceAll("'", ''), name = clean.split('!')[0]
        assert.ok(!(name === 'Caixa_Operacoes' && options.missingJournal), 'aba ausente não é solicitada')
        const values = clean === 'ContasFixas!P6' ? [[s.tabs.metaFixas]] : name === 'Caixa_Operacoes' ? s.journal : s.tabs[name]
        assert.ok(Array.isArray(values), `faixa inesperada: ${range}`)
        return { range, values: clone(values) }
      })
      const result = response(200, { spreadsheetId: SHEET, valueRanges })
      await options.afterRead?.(s, s.valuesReads)
      return result
    }
    assert.equal(c.method, 'POST')
    assert.ok(u.pathname.endsWith(':batchUpdate'))
    assert.ok(!u.pathname.includes('/values:'), 'nenhum escritor A1')
    assert.equal(c.body.requests.length, 1)
    const append = c.body.requests[0].appendCells
    assert.ok(append); assert.equal(append.sheetId, JOURNAL_ID); assert.equal(append.fields, 'userEnteredValue')
    assert.equal(append.rows.length, 1); assert.equal(append.rows[0].values.length, 50)
    await options.beforeAppend?.(s)
    if (options.appendStatus && options.appendStatus < 500) return response(options.appendStatus)
    const candidate = append.rows[0].values.map(decode)
    const duplicate = s.journal.slice(1).some((r) => r[0] === candidate[0])
    const prior = s.journal.slice(1).filter((r) => r[1] === candidate[1] && r[2] === candidate[2] && r[3] === candidate[3] && r[11] === true)
    candidate[11] = !duplicate && candidate[4] === (prior.at(-1)?.[0] ?? '')
    s.journal.push(candidate); s.appends++
    await options.afterAppend?.(s)
    if (options.lostReply) throw new TypeError('Resposta perdida depois do append')
    return response(options.appendStatus ?? 200, { spreadsheetId: SHEET, replies: [{}] })
  }
  t.after(() => { globalThis.fetch = originalFetch; if (storageDescriptor) Object.defineProperty(globalThis, 'sessionStorage', storageDescriptor); else delete globalThis.sessionStorage })
  return s
}

const salvar = (esperado = dados().Lancamentos, extras = {}, options = {}) => gravarRegistro('TOKEN_FICTICIO', SHEET, {
  aba: 'Lancamentos', id: 'L1', periodo: '*', revision: '', esperado, mudancas: { subcategoria_id: 'MOR-01', tipo: 'despesa', revisado: 'Sim' }, ...extras,
}, { now: NOW, operationId: IDS[0], ...options })
const byId = (tab, id) => tab.find((r) => r[0] === id)

test('consulta lê origem e diário completos, preservando tipos e datas seriais', async (t) => {
  const s = rede(t), tabs = await carregar('TOKEN_FICTICIO', SHEET, { now: NOW })
  assert.equal(tabs._caixa.configured, true); assert.equal(tabs._caixa.journalSheetId, JOURNAL_ID); assert.equal(tabs.metaFixas, 1000)
  assert.equal(byId(tabs.Lancamentos, 'L1')[3], 46328)
  const u = new URL(s.calls.find((c) => c.url.includes('/values:batchGet')).url)
  assert.equal(u.searchParams.get('valueRenderOption'), 'UNFORMATTED_VALUE'); assert.equal(u.searchParams.get('dateTimeRenderOption'), 'SERIAL_NUMBER')
  assert.ok(u.searchParams.getAll('ranges').some((r) => r.replaceAll("'", '') === 'Caixa_Operacoes!A:AX'))
  assert.equal(s.posts().length, 0)
})

test('operação válida é acrescentada por ID sem modificar qualquer célula da origem', async (t) => {
  const s = rede(t), original = clone(s.tabs), result = await salvar()
  assert.equal(result.operationId, IDS[0]); assert.equal(s.appends, 1); assert.deepEqual(s.tabs, original)
  assert.equal(byId(result.tabs.Lancamentos, 'L1')[8], 'MOR-01'); assert.equal(byId(result.tabs.Lancamentos, 'L1')[17], 'Sim')
  assert.deepEqual(byId(result.tabs.Lancamentos, 'L2'), byId(original.Lancamentos, 'L2'))
  assert.equal(result.tabs._caixa.records[recordKey('Lancamentos', 'L1', '*')].revision, IDS[0]); assert.deepEqual(s.stored(), [])
})

test('zero é número e texto de snapshot iniciado por igual continua literal', async (t) => {
  const base = dados(); base.ContasFixas[1][1] = '=NAO_EXECUTAR()'
  const s = rede(t, { tabs: base })
  const result = await gravarRegistro('TOKEN_FICTICIO', SHEET, { aba: 'ContasFixas', id: 'F1', periodo: '2026-11', revision: '', esperado: base.ContasFixas, mudancas: { pago: 'Sim', valor_mes: 0 } }, { now: NOW, operationId: IDS[0] })
  const cells = s.posts()[0].body.requests[0].appendCells.rows[0].values
  assert.equal(cells[13].userEnteredValue.stringValue, '=NAO_EXECUTAR()'); assert.equal(cells[19].userEnteredValue.numberValue, 0)
  assert.equal(byId(result.tabs.ContasFixas, 'F1')[7], 0); assert.equal(byId(result.tabs.ContasFixas, 'F1')[9], 'Sim')
})

for (const [name, hooks] of [
  ['antes da conferência', { beforeRead: (s, n) => { if (n === 1) [s.tabs.Lancamentos[1], s.tabs.Lancamentos[2]] = [s.tabs.Lancamentos[2], s.tabs.Lancamentos[1]] } }],
  ['entre conferência e append', { beforeAppend: (s) => { [s.tabs.Lancamentos[1], s.tabs.Lancamentos[2]] = [s.tabs.Lancamentos[2], s.tabs.Lancamentos[1]] } }],
  ['entre append e confirmação', { afterAppend: (s) => { [s.tabs.Lancamentos[1], s.tabs.Lancamentos[2]] = [s.tabs.Lancamentos[2], s.tabs.Lancamentos[1]] } }],
]) test(`reordenação ${name} nunca altera outro ID`, async (t) => {
  const s = rede(t, hooks), result = await salvar()
  assert.equal(s.appends, 1); assert.equal(s.journal[1][2], 'L1')
  assert.equal(byId(result.tabs.Lancamentos, 'L1')[8], 'MOR-01'); assert.equal(byId(result.tabs.Lancamentos, 'L2')[8], 'SEM-01')
  assert.equal(byId(s.tabs.Lancamentos, 'L1')[8], 'SEM-01'); assert.equal(byId(s.tabs.Lancamentos, 'L2')[8], 'SEM-01')
})

test('linha inserida durante a gravação não muda o destino', async (t) => {
  const s = rede(t, { beforeAppend: (fake) => { const extra = clone(fake.tabs.Lancamentos[2]); extra[0] = 'L3'; fake.tabs.Lancamentos.splice(1, 0, extra) } })
  const result = await salvar()
  assert.equal(byId(result.tabs.Lancamentos, 'L1')[8], 'MOR-01'); assert.equal(byId(result.tabs.Lancamentos, 'L3')[8], 'SEM-01'); assert.equal(s.appends, 1)
})

for (const [name, change] of [
  ['registro removido', (x) => x.Lancamentos.splice(1, 1)],
  ['ID duplicado', (x) => x.Lancamentos.push(clone(x.Lancamentos[1]))],
  ['conteúdo alterado', (x) => { x.Lancamentos[1][5] = -999 }],
  ['cabeçalho alterado', (x) => { x.Lancamentos[0][8] = 'campo_alheio' }],
]) test(`${name} antes da conferência não acrescenta operação`, async (t) => {
  const base = dados(), atual = clone(base); change(atual)
  const s = rede(t, { tabs: atual })
  await assert.rejects(salvar(base.Lancamentos), Error); assert.equal(s.posts().length, 0)
})

test('mudança externa durante append preserva a origem e informa conflito', async (t) => {
  const s = rede(t, { beforeAppend: (fake) => { fake.tabs.Lancamentos[1][5] = -777 } })
  await assert.rejects(salvar(), ErroConflito)
  assert.equal(s.appends, 1); assert.equal(byId(s.tabs.Lancamentos, 'L1')[5], -777); assert.equal(byId(s.tabs.Lancamentos, 'L1')[8], 'SEM-01')
  const tabs = await carregar('TOKEN_FICTICIO', SHEET, { now: NOW })
  assert.equal(tabs._caixa.records[recordKey('Lancamentos', 'L1', '*')].conflict, 'source_changed')
})

test('dois clientes com a mesma revisão não sobrescrevem um ao outro', async (t) => {
  const s = rede(t)
  const results = await Promise.allSettled([
    s.client('A', () => salvar(undefined, {}, { operationId: IDS[0] })),
    s.client('B', () => salvar(undefined, { mudancas: { subcategoria_id: 'MOR-02', tipo: 'despesa', revisado: 'Sim' } }, { operationId: IDS[1] })),
  ])
  assert.equal(s.appends, 2); assert.equal(s.journal.slice(1).filter((r) => r[11]).length, 1)
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
  assert.equal(results.filter((r) => r.status === 'rejected' && r.reason instanceof ErroConflito).length, 1)
  assert.equal(byId(s.tabs.Lancamentos, 'L1')[8], 'SEM-01')
})

test('revisão antiga é recusada antes de novo append', async (t) => {
  const s = rede(t); await salvar()
  await assert.rejects(salvar(undefined, {}, { operationId: IDS[1] }), ErroConflito); assert.equal(s.appends, 1)
})

test('resposta perdida guarda somente ID e recuperação confirma sem repetir', async (t) => {
  const s = rede(t, { lostReply: true })
  await assert.rejects(salvar(), ErroGravacaoIncerta); assert.equal(s.appends, 1); assert.deepEqual(s.stored(), [IDS[0]])
  const tabs = await recuperarPendencia('TOKEN_FICTICIO', SHEET, { now: NOW })
  assert.equal(tabs._caixa.pendingStatus, 'accepted'); assert.equal(s.appends, 1); assert.deepEqual(s.stored(), [])
})

test('fórmula de aceitação ainda pendente não é tratada como confirmação', async (t) => {
  const s = rede(t, { afterAppend: (fake) => { fake.journal.at(-1)[11] = '' } })
  await assert.rejects(salvar(), ErroGravacaoIncerta)
  assert.equal(s.appends, 1); assert.deepEqual(s.stored(), [IDS[0]])
  s.journal.at(-1)[11] = true
  const tabs = await recuperarPendencia('TOKEN_FICTICIO', SHEET, { now: NOW })
  assert.equal(tabs._caixa.pendingStatus, 'accepted'); assert.equal(s.appends, 1)
})

test('aceitação do servidor incoerente com a cadeia não confirma sucesso', async (t) => {
  const s = rede(t, { afterAppend: (fake) => { fake.journal.at(-1)[11] = false } })
  await assert.rejects(salvar(), Error)
  assert.equal(s.appends, 1); assert.deepEqual(s.stored(), [IDS[0]])
})

test('pendência ainda não encontrada bloqueia nova escrita sem reenvio automático', async (t) => {
  const s = rede(t, { lostReply: true })
  await assert.rejects(salvar(), ErroGravacaoIncerta)
  const saved = s.journal.pop()
  const tabs = await recuperarPendencia('TOKEN_FICTICIO', SHEET, { now: NOW })
  assert.equal(tabs._caixa.pendingStatus, 'pending'); assert.deepEqual(s.stored(), [IDS[0]])
  await assert.rejects(salvar(undefined, {}, { operationId: IDS[1] }), ErroGravacaoIncerta)
  assert.equal(s.appends, 1); s.journal.push(saved)
})

test('diário ausente preserva consulta e bloqueia escrita sem criar aba', async (t) => {
  const s = rede(t, { missingJournal: true }), tabs = await carregar('TOKEN_FICTICIO', SHEET, { now: NOW })
  assert.equal(tabs._caixa.configured, false); assert.equal(byId(tabs.Lancamentos, 'L1')[8], 'SEM-01')
  await assert.rejects(salvar(), ErroConfiguracao); assert.equal(s.posts().length, 0)
})

for (const invalid of [{ journalColumns: 49 }, { journalRows: 0 }]) test('diário com dimensões insuficientes não permite truncar a leitura', async (t) => {
  const s = rede(t, invalid)
  await assert.rejects(salvar(), ErroConfiguracao)
  assert.equal(s.posts().length, 0)
})

test('mês da tela já encerrado não vira pagamento do mês atual', async (t) => {
  const s = rede(t)
  await assert.rejects(gravarRegistro('TOKEN_FICTICIO', SHEET, {
    aba: 'ContasFixas', id: 'F1', periodo: '2026-10', revision: '', esperado: dados().ContasFixas, mudancas: { pago: 'Sim' },
  }, { now: NOW, operationId: IDS[0] }), ErroConflito)
  assert.equal(s.posts().length, 0)
})

test('sem guardar o operationId antes de enviar, nenhuma gravação é iniciada', async (t) => {
  const s = rede(t, { storageFailure: true })
  await assert.rejects(salvar(), ErroConfiguracao)
  assert.equal(s.posts().length, 0)
})

test('diário com cabeçalho inválido não permite append', async (t) => {
  const journal = [clone(JOURNAL_HEADERS)]; journal[0][0] = 'outro_id'
  const s = rede(t, { journal }); await assert.rejects(salvar(), Error); assert.equal(s.posts().length, 0)
})

for (const [name, extras] of [
  ['ID vazio', { id: '' }], ['aba não autorizada', { aba: 'Pessoas' }],
  ['endereço A1', { mudancas: { 'I2:J2': 'Sim' } }], ['campo não autorizado', { mudancas: { valor: -123 } }],
  ['revisão ausente', { revision: undefined }], ['período ausente', { periodo: undefined }],
]) test(`pedido inválido (${name}) nunca escreve`, async (t) => {
  const s = rede(t); await assert.rejects(salvar(undefined, extras), Error); assert.equal(s.posts().length, 0)
})

test('falha de leitura não escreve nem cria pendência', async (t) => {
  const s = rede(t, { readFailure: new TypeError('Rede fictícia indisponível') })
  await assert.rejects(salvar(), (e) => !(e instanceof ErroGravacaoIncerta)); assert.equal(s.posts().length, 0); assert.deepEqual(s.stored(), [])
})

for (const [status, classe] of [[401, ErroSessao], [403, Error]]) test(`${status} na conferência não escreve`, async (t) => {
  const s = rede(t, { metadataStatus: status })
  await assert.rejects(salvar(), (e) => e instanceof classe && !(e instanceof ErroGravacaoIncerta)); assert.equal(s.posts().length, 0)
})

test('401 no append não é confirmado como sucesso', async (t) => {
  const s = rede(t, { appendStatus: 401 })
  await assert.rejects(salvar(), ErroSessao); assert.equal(s.posts().length, 1); assert.equal(s.appends, 0)
})

test('reconciliação explícita confirma uma nova versão, sem sobrescrever a origem', async (t) => {
  const s = rede(t); await salvar(); s.tabs.Lancamentos[1][5] = -200
  const before = await carregar('TOKEN_FICTICIO', SHEET, { now: NOW }), record = before._caixa.records[recordKey('Lancamentos', 'L1', '*')]
  assert.equal(record.conflict, 'source_changed')
  const result = await salvar(before.Lancamentos, { revision: record.revision, mode: 'use_source', mudancas: {}, fonteEsperada: record.sourceRow }, { operationId: IDS[1] })
  assert.equal(result.tabs._caixa.records[recordKey('Lancamentos', 'L1', '*')].conflict, null)
  assert.equal(byId(result.tabs.Lancamentos, 'L1')[5], -200); assert.equal(s.appends, 2); assert.equal(byId(s.tabs.Lancamentos, 'L1')[8], 'SEM-01')
})
