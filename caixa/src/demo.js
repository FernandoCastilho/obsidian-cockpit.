// Dados fictícios no mesmo formato da planilha, para ver o app sem entrar com o Google.
import { deslocarMes, mesAtual } from './format.js'

const br = (mes, dia) => `${String(dia).padStart(2, '0')}/${mes.slice(5)}/${mes.slice(0, 4)}`

export function tabsDemo() {
  const hoje = mesAtual()
  const lanc = [['lancamento_id', 'conta_id', 'pessoa_id', 'data', 'data_caixa', 'valor', 'descricao_original', 'descricao_limpa', 'subcategoria_id', 'tipo', 'status', 'parcela_n', 'parcela_total', 'recorrencia_id', 'par_transferencia_id', 'chave_dedup', 'importacao_id', 'revisado', 'obs']]
  let n = 0
  const add = (mes, dia, conta, pessoa, valor, desc, sub, tipo, status = 'realizado', revisado = 'Sim') =>
    lanc.push([`D-${++n}`, conta, pessoa, br(mes, dia), br(mes, dia), valor, desc, '', sub, tipo, status, '', '', '', '', '', '', revisado, ''])
  for (const d of [0, -1, -2]) {
    const m = deslocarMes(hoje, d)
    add(m, 5, 'CC', 'P01', 21100, 'FOLHA PAGAMENTO', 'SAL-01', 'receita')
    add(m, 6, 'CC', 'P02', 11900, 'SALARIO', 'SAL-01', 'receita')
    add(m, 8, 'CC', 'FAM', -930, 'CONDOMINIO', 'MOR-04', 'despesa')
    add(m, 9, 'CC', 'FAM', -700, 'DA CPFL', 'MOR-06', 'despesa')
    add(m, 10, 'CC', 'FAM', -500, 'DA AGUA', 'MOR-01', 'despesa')
    add(m, 12, 'CC', 'FAM', -3018, 'ESCOLA', 'EDU-07', 'despesa')
    add(m, 14, 'CC', 'FAM', -1000, 'EMPREGADA', 'MOR-10', 'despesa')
    add(m, 15, 'CC', 'P01', -10500, 'PAGTO CARTAO', 'INT-02', 'pagto_fatura')
    add(m, 16, 'CC', 'P01', -240, 'PIX TRANSF JOAO', 'SEM-D-01', 'despesa', 'realizado', 'Não')
    add(m, 17, 'CC', 'P02', -1180, 'PIX TRANSF STUDIO', 'SEM-D-01', 'despesa', 'realizado', 'Não')
    add(m, 18, 'CC', 'FAM', 69, 'PGTO REEMBOLSO', 'REE-01', 'reembolso')
  }
  add(hoje, 27, 'CC', 'FAM', -2276, 'CONSORCIO', 'SEM-D-01', 'despesa', 'pendente', 'Não')
  return {
    Pessoas: [['pessoa_id', 'nome', 'papel', 'ativa'], ['FAM', 'Família', '', 'Sim'], ['P01', 'Fernando', '', 'Sim'], ['P02', 'Iris', '', 'Sim']],
    Contas: [['conta_id', 'apelido', 'tipo', 'entra_no_fechamento'], ['CC', 'Conta corrente', 'corrente', 'Sim']],
    Categorias: [['categoria_id', 'nome', 'tipo', 'ordem'], ['EDU', 'Educação', 'despesa', 1], ['MOR', 'Moradia', 'despesa', 3], ['SAL', 'Salário', 'receita', 7], ['INT', 'Movimentação interna', 'interna', 9], ['REE', 'Reembolsos', 'reembolso', 10], ['SEM-D', 'Sem categoria', 'despesa', 11]],
    Subcategorias: [['subcategoria_id', 'categoria_id', 'nome', 'ativa'], ['EDU-07', 'EDU', 'Mensalidade escolar', 'Sim'], ['MOR-01', 'MOR', 'Água e esgoto', 'Sim'], ['MOR-04', 'MOR', 'Condomínio', 'Sim'], ['MOR-06', 'MOR', 'Energia elétrica', 'Sim'], ['MOR-10', 'MOR', 'Limpeza e diarista', 'Sim'], ['SAL-01', 'SAL', 'Salário', 'Sim'], ['INT-02', 'INT', 'Pagamento de fatura', 'Sim'], ['REE-01', 'REE', 'Reembolso recebido', 'Sim'], ['SEM-D-01', 'SEM-D', 'Sem categoria', 'Sim']],
    Lancamentos: lanc,
    ContasFixas: [
      ['conta_fixa_id', 'descricao', 'subcategoria_id', 'pessoa_id', 'pagador', 'forma_pagamento', 'valor_padrao', 'valor_mes', 'dia_vencimento', 'pago', 'recorrencia_id', 'ativa', 'obs'],
      ['CF-1', 'Seguro de vida', 'SEM-D-01', 'P01', '', 'cartao', 385, '', '', 'Não', '', 'Sim', ''],
      ['CF-2', 'Água', 'MOR-01', 'FAM', 'P01', '', 500, 500, 1, 'Sim', '', 'Sim', ''],
      ['CF-3', 'Cartão de crédito', 'INT-02', 'FAM', '', '', 6000, 10500, 10, 'Não', '', 'Sim', ''],
      ['CF-4', 'Luz', 'MOR-06', 'FAM', '', '', 700, 700, 25, 'Não', '', 'Sim', ''],
      ['CF-5', 'Consórcio', 'SEM-D-01', 'FAM', '', '', '', 2276, 28, 'Não', '', 'Sim', ''],
      ['CF-6', 'Empregada', 'MOR-10', 'FAM', '', '', 1000, 1000, 30, 'Não', '', 'Sim', ''],
    ],
    metaFixas: 25000,
  }
}
