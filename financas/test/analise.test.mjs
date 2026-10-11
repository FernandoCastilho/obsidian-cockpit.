import test from 'node:test'
import assert from 'node:assert/strict'
import { buildData } from '../src/model.js'
import { saldos, patrimonio, revisao, vencimentos, fluxo, sugestaoOrcamento, gastoVariavelMedio, metasResumo, dividasResumo, aportes } from '../src/analise.js'

const tabs = {
  Pessoas: [['pessoa_id', 'nome'], ['FAM', 'Família'], ['P01', 'Fernando']],
  Contas: [
    ['conta_id', 'apelido', 'pessoa_id', 'tipo', 'entra_no_fechamento', 'saldo_inicial', 'data_saldo_inicial'],
    ['CC', 'Conta', 'P01', 'corrente', 'Sim', 1000, '2025-12-31'],
    ['CARD', 'Cartão', 'P01', 'cartao', 'Não', '', ''],
    ['SEM', 'Outra', 'P01', 'corrente', 'Sim', '', ''],
  ],
  Categorias: [['categoria_id', 'nome', 'tipo', 'ordem'], ['MOR', 'Moradia', 'despesa', 1], ['SAL', 'Salário', 'receita', 2]],
  Subcategorias: [['subcategoria_id', 'categoria_id', 'nome'], ['MOR-03', 'MOR', 'Financiamento'], ['MOR-17', 'MOR', 'Telefone'], ['SAL-01', 'SAL', 'Salário']],
  Lancamentos: [
    ['lancamento_id', 'conta_id', 'pessoa_id', 'data', 'valor', 'descricao_limpa', 'subcategoria_id', 'tipo', 'status'],
    ['a', 'CC', 'P01', '2025-12-20', -50, 'antes do saldo', 'MOR-17', 'despesa', 'realizado'],
    ['b', 'CC', 'P01', '2026-01-10', 500, 'entrada', 'SAL-01', 'receita', 'realizado'],
    ['c', 'CC', 'P01', '2026-01-12', -200, 'financ', 'MOR-03', 'despesa', 'realizado'],
    ['d', 'CC', 'P01', '2026-01-15', -80, 'PIX FULANO', '', 'despesa', 'realizado'],
    ['e', 'CC', 'P01', '2026-01-20', -30, 'PIX FULANO', '', 'despesa', 'realizado'],
    ['f', 'CC', 'P01', '2026-01-25', -300, 'aplicacao', '', 'investimento', 'realizado'],
  ],
  Recorrencias: [
    ['recorrencia_id', 'descricao', 'subcategoria_id', 'conta_id', 'pessoa_id', 'valor', 'dia_mes', 'periodicidade', 'inicio', 'fim', 'ativa'],
    ['R1', 'Financiamento', 'MOR-03', 'CC', 'P01', -210, 12, 'mensal', '2026-01-01', '', 'Sim'],
    ['R2', 'Salário', 'SAL-01', 'CC', 'P01', 500, 31, 'mensal', '2026-01-01', '', 'Sim'],
    ['R3', 'Inativa', 'MOR-17', 'CC', 'P01', -99, 5, 'mensal', '2026-01-01', '', 'Não'],
  ],
  Metas: [['meta_id', 'nome', 'valor_alvo', 'valor_atual', 'prazo', 'pessoa_id', 'status'], ['M1', 'Reserva', 1200, 200, '2026-06-30', 'P01', 'ativa']],
  Dividas: [['divida_id', 'descricao', 'saldo_devedor', 'parcela', 'parcelas_restantes', 'pessoa_id', 'status'], ['D1', 'Imóvel', '', 210, 24, 'P01', 'ativa']],
}
const data = buildData(tabs)

test('saldo = saldo inicial + realizado depois da data do saldo', () => {
  const s = saldos(data)
  assert.equal(s.find((x) => x.conta.id === 'CC').saldo, 1000 + 500 - 200 - 80 - 30 - 300)
  assert.equal(s.find((x) => x.conta.id === 'SEM').saldo, null)
  assert.ok(!s.some((x) => x.conta.id === 'CARD'))
})

test('patrimônio avisa quando falta saldo devedor ou saldo de conta', () => {
  const p = patrimonio(data, { hoje: '2026-02-01' })
  assert.equal(p.liquidez, 890)
  assert.equal(p.dividaSemSaldo, true)
  assert.equal(p.contaSemSaldo, true)
})

test('revisão agrupa por descrição e ordena por valor', () => {
  const r = revisao(data)
  assert.equal(r.linhas, 2)
  assert.equal(r.grupos[0].desc, 'PIX FULANO')
  assert.equal(r.grupos[0].n, 2)
  assert.equal(r.grupos[0].total, -110)
  assert.equal(r.grupos[0].sugestao, 'PIX FULANO')
})

test('vencimentos ignoram recorrência já paga no mês e inativas', () => {
  const v = vencimentos(data, { hoje: '2026-01-13', dias: 30 })
  assert.deepEqual(v.map((x) => [x.data, x.desc]), [['2026-02-12', 'Financiamento']])
})

test('recorrência no dia 31 cai no último dia de fevereiro', () => {
  const v = vencimentos(data, { hoje: '2026-02-01', dias: 28 })
  assert.ok(v.some((x) => x.data === '2026-02-28' && x.desc === 'Salário'))
})

test('fluxo projeta saldo mês a mês a partir do saldo atual', () => {
  const f = fluxo(data, { hoje: '2026-02-01', meses: 2 })
  assert.equal(f.inicial, 890)
  assert.equal(f.meses.length, 2)
  assert.equal(f.variavel, 80) // média de jan (110) e dez (50)
  assert.equal(f.meses[0].variavel, 77.14) // 27/28 do mês restante
  assert.equal(f.meses[0].final, 890 + 500 - 210 - 77.14)
  assert.equal(f.meses[1].final, Math.round((890 + 500 - 210 - 77.14 + 500 - 210 - 80) * 100) / 100)
})

test('gasto variável médio ignora subcategorias com recorrência e meses sem movimento', () => {
  // jan: PIX sem categoria 110; dez: telefone 50; financiamento tem recorrência e fica de fora
  assert.equal(gastoVariavelMedio(data, { hoje: '2026-02-10' }), 80)
  assert.equal(gastoVariavelMedio(data, { hoje: '2026-06-10' }), 0)
})

test('sugestão de orçamento usa a média dos meses anteriores com movimento', () => {
  const s = sugestaoOrcamento(data, { month: '2026-02' })
  assert.deepEqual(s.meses, ['2026-01', '2025-12'])
  assert.equal(s.total, 125)
})

test('metas e dívidas', () => {
  const m = metasResumo(data, { hoje: '2026-01-31' })[0]
  assert.equal(m.falta, 1000)
  assert.equal(m.mensal, 200)
  const d = dividasResumo(data, { hoje: '2026-01-15' })[0]
  assert.equal(d.quitacao, '2028-01')
  assert.equal(d.restoParcelas, 5040)
})

test('aportes líquidos', () => {
  assert.equal(aportes(data).total, 300)
})
