import test from 'node:test'
import assert from 'node:assert/strict'
import { toNumber, toIsoDate, toMonth, buildData, summarizeMonth, summarizeYear } from '../src/model.js'

test('toNumber aceita número, texto brasileiro e negativos', () => {
  assert.equal(toNumber(-12.5), -12.5)
  assert.equal(toNumber('R$ 1.234,56'), 1234.56)
  assert.equal(toNumber('-380,8'), -380.8)
  assert.equal(toNumber('(50,00)'), -50)
  assert.equal(toNumber(''), 0)
  assert.equal(toNumber('abc'), 0)
})

test('toIsoDate e toMonth', () => {
  assert.equal(toIsoDate(46023), '2026-01-01')
  assert.equal(toIsoDate('05/03/2026'), '2026-03-05')
  assert.equal(toIsoDate('2026-03-05'), '2026-03-05')
  assert.equal(toIsoDate('lixo'), null)
  assert.equal(toMonth('2026-10'), '2026-10')
  assert.equal(toMonth('10/2026'), '2026-10')
  assert.equal(toMonth(46296), '2026-10')
})

const tabs = {
  Pessoas: [['pessoa_id', 'nome'], ['FAM', 'Família'], ['P01', 'Fernando'], ['P02', 'Iris']],
  Contas: [
    ['conta_id', 'apelido', 'tipo', 'entra_no_fechamento'],
    ['CC', 'Conta', 'corrente', 'Sim'],
    ['CARD', 'Cartão', 'cartao', 'Não'],
  ],
  Categorias: [['categoria_id', 'nome', 'tipo', 'ordem'], ['MOR', 'Moradia', 'despesa', 1], ['SAL', 'Salário', 'receita', 2], ['INT', 'Interna', 'interna', 3], ['REE', 'Reembolsos', 'reembolso', 4]],
  Subcategorias: [
    ['subcategoria_id', 'categoria_id', 'nome'],
    ['MOR-01', 'MOR', 'Água'],
    ['MOR-02', 'MOR', 'Energia'],
    ['SAL-01', 'SAL', 'Salário'],
    ['INT-02', 'INT', 'Pagamento de fatura'],
    ['REE-01', 'REE', 'Reembolso'],
  ],
  Lancamentos: [
    ['lancamento_id', 'conta_id', 'pessoa_id', 'data', 'data_caixa', 'valor', 'descricao_limpa', 'subcategoria_id', 'tipo', 'status'],
    ['1', 'CC', 'P01', '02/10/2026', '02/10/2026', 8000, 'Folha', 'SAL-01', 'receita', 'realizado'],
    ['2', 'CC', 'P01', '05/10/2026', '05/10/2026', -100, 'Água', 'MOR-01', 'despesa', 'realizado'],
    ['3', 'CARD', 'P02', '06/10/2026', '15/10/2026', -300, 'Energia no cartão', 'MOR-02', 'despesa', 'realizado'],
    ['4', 'CC', 'P01', '15/10/2026', '15/10/2026', -300, 'Fatura', 'INT-02', 'pagto_fatura', 'realizado'],
    ['5', 'CC', 'P01', '10/10/2026', '10/10/2026', 40, 'Reembolso', 'REE-01', 'reembolso', 'realizado'],
    ['6', 'CC', 'P01', '28/10/2026', '28/10/2026', -50, 'Água futura', 'MOR-01', 'despesa', 'pendente'],
  ],
  Orcamento: [['mes', 'subcategoria_id', 'pessoa_id', 'valor_planejado'], ['2026-10', 'MOR-01', 'P01', 120], ['2026-10', 'MOR-02', 'P02', 250]],
}

test('resultado: fatura fora, reembolso abate despesa, pendente separado', () => {
  const s = summarizeMonth(buildData(tabs), { month: '2026-10' })
  assert.equal(s.receitas.realizado, 8000)
  assert.equal(s.despesas.realizado, 400) // água 100 + energia 300; a fatura não conta
  assert.equal(s.reembolsos.realizado, 40)
  assert.equal(s.liquida.realizado, 360)
  assert.equal(s.resultado.realizado, 7640)
  assert.equal(s.despesas.pendente, 50)
  assert.equal(s.resultado.previsto, 7590)
})

test('categorias trazem orçado e subcategorias', () => {
  const s = summarizeMonth(buildData(tabs), { month: '2026-10' })
  assert.equal(s.categorias.length, 1)
  const c = s.categorias[0]
  assert.equal(c.nome, 'Moradia')
  assert.equal(c.orcado, 370)
  assert.equal(c.realizado, 400)
  assert.deepEqual(c.subs.map((x) => x.nome).sort((a, b) => a.localeCompare(b, 'pt')), ['Água', 'Energia'])
})

test('filtro por pessoa', () => {
  const d = buildData(tabs)
  assert.equal(summarizeMonth(d, { month: '2026-10', pessoa: 'P02' }).despesas.realizado, 300)
  assert.equal(summarizeMonth(d, { month: '2026-10', pessoa: 'P02' }).orcado, 250)
  assert.equal(summarizeMonth(d, { month: '2026-10', pessoa: 'P01' }).orcado, 120)
})

test('fechamento usa só a conta corrente, pela data de caixa', () => {
  const s = summarizeMonth(buildData(tabs), { month: '2026-10' })
  assert.equal(s.caixa.entradas, 8040) // salário + reembolso
  assert.equal(s.caixa.saidas, 400) // água 100 + fatura 300; a compra no cartão não sai do caixa
  assert.equal(s.caixa.liquido, 7640)
  assert.equal(s.caixa.pendente, -50)
})

test('tabela anual', () => {
  const y = summarizeYear(buildData(tabs), { year: 2026 })
  assert.equal(y.meses.length, 12)
  assert.equal(y.linhas[0].nome, 'Moradia')
  assert.equal(y.linhas[0].celulas[9].r, 400)
  assert.equal(y.linhas[0].celulas[9].p, 50)
  assert.equal(y.resultado[9], 7640)
  assert.equal(y.resultado[0], 0)
})

test('abas ausentes não quebram', () => {
  const d = buildData({})
  const s = summarizeMonth(d, { month: '2026-10' })
  assert.equal(s.resultado.realizado, 0)
})
