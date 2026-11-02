import test from 'node:test'
import assert from 'node:assert/strict'
import { gravarRegistro, ErroConflito, ErroGravacaoIncerta, ErroSessao } from '../src/sheets.js'

const copy = (x) => structuredClone(x)
const lancamentos = () => [
  ['lancamento_id', 'conta_id', 'pessoa_id', 'data', 'data_caixa', 'valor', 'descricao_original', 'descricao_limpa', 'subcategoria_id', 'tipo', 'status', 'revisado'],
  ['L1', 'CC', 'FAM', '01/11/2026', '01/11/2026', -100, 'Luz', '', 'SEM-01', 'despesa', 'realizado', 'Não'],
  ['L2', 'CC', 'FAM', '02/11/2026', '02/11/2026', -80, 'Internet', '', 'SEM-01', 'despesa', 'realizado', 'Não'],
]
const fixas = () => [
  ['conta_fixa_id', 'descricao', 'subcategoria_id', 'pessoa_id', 'pagador', 'forma_pagamento', 'valor_padrao', 'valor_mes', 'dia_vencimento', 'pago', 'recorrencia_id', 'ativa', 'obs'],
  ['F1', 'Luz', 'MOR-01', 'FAM', '', '', 100, 100, 5, 'Não', '', 'Sim', ''],
  ['F2', 'Internet', 'MOR-02', 'FAM', '', '', 80, 80, 10, 'Não', '', 'Sim', ''],
]
const response = (status, json = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => copy(json) })

function rede(t, atual, opcoes = {}) {
  const original = globalThis.fetch
  const chamadas = []
  globalThis.fetch = async (url, init = {}) => {
    const chamada = { url: String(url), method: init.method ?? 'GET', headers: init.headers, body: init.body ? JSON.parse(init.body) : null }
    chamadas.push(chamada)
    if (chamada.method === 'GET') {
      if (opcoes.erroLeitura) throw opcoes.erroLeitura
      return response(opcoes.statusLeitura ?? 200, { valueRanges: [{ values: copy(atual) }] })
    }
    if (opcoes.erroEscrita) throw opcoes.erroEscrita
    const n = chamada.body?.data?.length ?? 0
    return response(opcoes.statusEscrita ?? 200, opcoes.respostaEscrita ?? {
      totalUpdatedCells: n,
      responses: Array.from({ length: n }, () => ({ updatedCells: 1 })),
    })
  }
  t.after(() => { globalThis.fetch = original })
  return {
    chamadas,
    posts: () => chamadas.filter((c) => c.method === 'POST'),
  }
}

const salvarLancamento = (esperado, extras = {}) => gravarRegistro('TOKEN_FICTICIO', 'PLANILHA_FICTICIA', {
  aba: 'Lancamentos', id: 'L1', esperado, mudancas: { subcategoria_id: 'MOR-01', tipo: 'despesa', revisado: 'Sim' }, ...extras,
})

test('gravação válida confere o registro e altera somente as células permitidas', async (t) => {
  const esperado = lancamentos(), original = copy(esperado)
  const fake = rede(t, esperado)
  const resultado = await salvarLancamento(esperado)
  assert.deepEqual(fake.chamadas.map((c) => c.method), ['GET', 'POST'])
  const consulta = new URL(fake.chamadas[0].url)
  assert.match(consulta.pathname, /\/values:batchGet$/)
  assert.equal(consulta.searchParams.get('valueRenderOption'), 'UNFORMATTED_VALUE')
  assert.equal(consulta.searchParams.get('dateTimeRenderOption'), 'FORMATTED_STRING')
  assert.equal(fake.posts()[0].body.valueInputOption, 'USER_ENTERED')
  assert.deepEqual(fake.posts()[0].body.data.map(({ range, values }) => ({ range, values })), [
    { range: 'Lancamentos!I2', values: [['MOR-01']] },
    { range: 'Lancamentos!J2', values: [['despesa']] },
    { range: 'Lancamentos!L2', values: [['Sim']] },
  ])
  assert.deepEqual(esperado, original, 'não modifica a cópia recebida pelo chamador')
  const novo = copy(original)
  novo[1][8] = 'MOR-01'; novo[1][9] = 'despesa'; novo[1][11] = 'Sim'
  assert.deepEqual(resultado.snapshot, novo)
})

test('contas fixas: pagamento e valor do mês usam colunas distintas e preservam as demais', async (t) => {
  const esperado = fixas(), fake = rede(t, esperado)
  const resultado = await gravarRegistro('TOKEN_FICTICIO', 'PLANILHA_FICTICIA', {
    aba: 'ContasFixas', id: 'F1', esperado, mudancas: { pago: 'Sim', valor_mes: 123.45 },
  })
  assert.deepEqual(fake.posts()[0].body.data.map(({ range, values }) => ({ range, values })), [
    { range: 'ContasFixas!J2', values: [['Sim']] },
    { range: 'ContasFixas!H2', values: [[123.45]] },
  ])
  assert.equal(resultado.snapshot[1][7], 123.45)
  assert.equal(resultado.snapshot[1][9], 'Sim')
  assert.deepEqual(resultado.snapshot[2], esperado[2])
})

test('células finais vazias omitidas pelo Sheets não geram conflito falso', async (t) => {
  const esperado = lancamentos()
  esperado[0].push('obs'); esperado[1].push(''); esperado[2].push('')
  const atual = copy(esperado)
  atual[1].pop(); atual[2][12] = null
  const fake = rede(t, atual)
  const resultado = await salvarLancamento(esperado)
  assert.equal(fake.posts().length, 1)
  assert.equal(resultado.snapshot[1][8], 'MOR-01')
})

// A conferência abaixo detecta alterações anteriores à última leitura. Não existe
// comparação atômica com o POST: edição externa posterior permanece fora desta mitigação.
for (const [nome, alterar] of [
  ['linhas reordenadas', (x) => { [x[1], x[2]] = [x[2], x[1]] }],
  ['linha inserida antes do lançamento', (x) => { const n = copy(x[2]); n[0] = 'L3'; x.splice(1, 0, n) }],
  ['lançamento excluído', (x) => { x.splice(1, 1) }],
  ['ID duplicado na leitura atual', (x) => { x.push(copy(x[1])) }],
  ['ID modificado', (x) => { x[1][0] = 'OUTRO' }],
  ['campo de classificação modificado', (x) => { x[1][8] = 'MOR-OUTRA' }],
  ['outro valor do registro modificado', (x) => { x[1][5] = -900 }],
  ['cabeçalho renomeado', (x) => { x[0][8] = 'categoria' }],
  ['colunas reordenadas', (x) => { for (const r of x) [r[8], r[9]] = [r[9], r[8]] }],
]) {
  test(`conflito sem POST: ${nome}`, async (t) => {
    const esperado = lancamentos(), atual = copy(esperado)
    alterar(atual)
    const fake = rede(t, atual)
    await assert.rejects(salvarLancamento(esperado), ErroConflito)
    assert.equal(fake.posts().length, 0)
  })
}

for (const [nome, preparar, extras] of [
  ['ID vazio', () => {}, { id: '' }],
  ['ID apenas com espaços', () => {}, { id: '   ' }],
  ['ID ambíguo com espaços', () => {}, { id: ' L1 ' }],
  ['ID ausente no snapshot', () => {}, { id: 'INEXISTENTE' }],
  ['ID duplicado no snapshot', (x) => { x.push(copy(x[1])) }, {}],
  ['coluna ID ausente', (x) => { x[0][0] = 'codigo' }, {}],
  ['coluna ID duplicada', (x) => { x[0][1] = 'lancamento_id' }, {}],
  ['coluna de destino duplicada', (x) => { x[0][7] = 'SUBCATEGORIA_ID' }, {}],
  ['coluna de destino ausente', (x) => { x[0][8] = 'outra' }, {}],
  ['aba fora da lista permitida', () => {}, { aba: 'Pessoas' }],
  ['campo fora da lista permitida', () => {}, { mudancas: { valor: -999 } }],
  ['intervalo A1 fornecido como campo', () => {}, { mudancas: { 'I2:J2': 'Sim' } }],
  ['alteração vazia', () => {}, { mudancas: {} }],
]) {
  test(`pedido inválido sem POST: ${nome}`, async (t) => {
    const esperado = lancamentos()
    preparar(esperado)
    const fake = rede(t, esperado)
    await assert.rejects(salvarLancamento(esperado, extras), Error)
    assert.equal(fake.posts().length, 0)
  })
}

test('falha de rede na conferência não tenta escrever', async (t) => {
  const falha = new TypeError('Rede indisponível na leitura')
  const fake = rede(t, lancamentos(), { erroLeitura: falha })
  await assert.rejects(salvarLancamento(lancamentos()), (e) => e.cause === falha && /Nenhuma gravação foi enviada/.test(e.message))
  assert.equal(fake.posts().length, 0)
})

test('sessão expirada na conferência volta como ErroSessao, sem escrita', async (t) => {
  const fake = rede(t, lancamentos(), { statusLeitura: 401 })
  await assert.rejects(salvarLancamento(lancamentos()), ErroSessao)
  assert.equal(fake.posts().length, 0)
})

for (const [nome, opcoes] of [
  ['conexão perdida após o envio', { erroEscrita: new TypeError('Conexão perdida') }],
  ['HTTP 500', { statusEscrita: 500 }],
  ['resposta sem confirmação de células', { respostaEscrita: {} }],
  ['contagem de células incoerente', { respostaEscrita: { totalUpdatedCells: 1, responses: [{ updatedCells: 1 }] } }],
]) {
  test(`resultado incerto sem tentativa automática: ${nome}`, async (t) => {
    const fake = rede(t, lancamentos(), opcoes)
    await assert.rejects(salvarLancamento(lancamentos()), ErroGravacaoIncerta)
    assert.equal(fake.posts().length, 1)
  })
}
