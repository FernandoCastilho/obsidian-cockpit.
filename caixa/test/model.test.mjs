import test from 'node:test'
import assert from 'node:assert/strict'
import { buildData, resumoDoMes, resumoFixas, proximosVencimentos, tipoParaSub, colunaDe, toNumber, toIsoDate } from '../src/model.js'

const tabs = {
  Pessoas: [['pessoa_id', 'nome', 'papel', 'ativa'], ['FAM', 'Família', '', 'Sim'], ['P01', 'Fernando', '', 'Sim']],
  Contas: [['conta_id', 'apelido', 'tipo', 'entra_no_fechamento'], ['CC', 'Conta', 'corrente', 'Sim'], ['CT', 'Cartão', 'cartao', 'Não']],
  Categorias: [['categoria_id', 'nome', 'tipo', 'ordem'], ['MOR', 'Moradia', 'despesa', 1], ['SAL', 'Salário', 'receita', 2], ['SEM-D', 'Sem categoria', 'despesa', 3]],
  Subcategorias: [['subcategoria_id', 'categoria_id', 'nome', 'ativa'], ['MOR-04', 'MOR', 'Condomínio', 'Sim'], ['SAL-01', 'SAL', 'Salário', 'Sim'], ['SEM-D-01', 'SEM-D', 'Sem categoria', 'Sim']],
  Lancamentos: [
    ['lancamento_id', 'conta_id', 'pessoa_id', 'data', 'data_caixa', 'valor', 'descricao_original', 'descricao_limpa', 'subcategoria_id', 'tipo', 'status', 'revisado'],
    ['L1', 'CC', 'P01', '05/10/2026', '05/10/2026', 10000, 'FOLHA', '', 'SAL-01', 'receita', 'realizado', 'Não'],
    ['L2', 'CC', 'FAM', '06/10/2026', '06/10/2026', '-930,00', 'CONDOMINIO', '', 'MOR-04', 'despesa', 'realizado', 'Não'],
    ['L3', 'CC', 'FAM', '07/10/2026', '07/10/2026', 100, 'PGTO ITAU', '', 'MOR-04', 'reembolso', 'realizado', 'Não'],
    ['L4', 'CC', 'P01', '08/10/2026', '08/10/2026', -5000, 'ITAU BLACK', '', 'MOR-04', 'pagto_fatura', 'realizado', 'Não'],
    ['L5', 'CC', 'P01', '09/10/2026', '09/10/2026', -77, 'PIX FULANO', '', 'SEM-D-01', 'despesa', 'realizado', 'Não'],
    ['L6', 'CC', 'FAM', '13/10/2026', '13/10/2026', -400, 'PAG TIT', '', 'MOR-04', 'despesa', 'pendente', 'Não'],
    ['L7', 'CT', 'FAM', '30/09/2026', '12/10/2026', -200, 'COMPRA', '', 'MOR-04', 'despesa', 'realizado', 'Não'],
  ],
  ContasFixas: [
    ['conta_fixa_id', 'descricao', 'subcategoria_id', 'pessoa_id', 'pagador', 'forma_pagamento', 'valor_padrao', 'valor_mes', 'dia_vencimento', 'pago', 'recorrencia_id', 'ativa', 'obs'],
    ['CF-01', 'Seguro', 'MOR-04', 'P01', '', 'cartao', 385, '', '', 'Não', '', 'Sim', ''],
    ['CF-02', 'Luz', 'MOR-04', 'FAM', '', '', 700, 700, 28, 'Não', '', 'Sim', ''],
    ['CF-03', 'Água', 'MOR-04', 'FAM', 'P01', '', 500, '', 1, 'Sim', '', 'Sim', ''],
    ['CF-04', 'Sem valor', 'MOR-04', 'FAM', '', '', '', '', 30, 'Não', '', 'Sim', ''],
  ],
  metaFixas: 25000,
}
const data = buildData(tabs)

test('conversões de número e data', () => {
  assert.equal(toNumber('-1.234,56'), -1234.56)
  assert.equal(toNumber(12), 12)
  assert.equal(toIsoDate('02/01/2026'), '2026-01-02')
})

test('resumo do mês: reembolso abate despesa; fatura, transferência e pendente ficam fora', () => {
  const r = resumoDoMes(data.lancamentos, '2026-10')
  assert.equal(r.receitas, 10000)
  assert.equal(r.despesas, 930 + 77) // compra de cartão de 30/09 é de setembro
  assert.equal(r.reembolsos, 100)
  assert.equal(r.aSair, 400)
  assert.equal(r.semCategoria, 1)
  assert.equal(r.resultado, 10000 - (1007 - 100))
  assert.equal(resumoDoMes(data.lancamentos, '2026-09').despesas, 200)
})

test('filtro por pessoa', () => {
  assert.equal(resumoDoMes(data.lancamentos, '2026-10', 'FAM').despesas, 930)
  assert.equal(resumoDoMes(data.lancamentos, '2026-10', 'P01').receitas, 10000)
})

test('contas fixas: cartão não soma em dobro e meta gera folga', () => {
  const r = resumoFixas(data.fixas, data.meta)
  assert.equal(r.total, 700 + 500 + 0)
  assert.equal(r.pago, 500)
  assert.equal(r.restante, 700)
  assert.equal(r.folga, 25000 - 1200)
  assert.equal(r.semValor, 1)
})

test('próximos vencimentos ignoram pagas, cartão e itens sem valor', () => {
  const p = proximosVencimentos(data.fixas, 30)
  assert.deepEqual(p.map((f) => f.id), ['CF-02'])
  assert.equal(p[0].atrasada, true)
})

test('tipo segue a subcategoria e a coluna é achada pelo nome', () => {
  assert.equal(tipoParaSub('INT-02'), 'pagto_fatura')
  assert.equal(tipoParaSub('SAL-01', { tipo: 'receita' }), 'receita')
  assert.equal(tipoParaSub('MOR-04', { tipo: 'despesa' }), 'despesa')
  assert.equal(colunaDe(tabs.Lancamentos, 'subcategoria_id'), 'I')
  assert.equal(data.lancamentos.find((l) => l.id === 'L5').row, 6)
})
