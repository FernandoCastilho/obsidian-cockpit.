// Dados de exemplo, no mesmo formato das abas da planilha. Não são dados reais.
const H = {
  Pessoas: [['pessoa_id', 'nome'], ['FAM', 'Família'], ['P01', 'Fernando'], ['P02', 'Iris']],
  Contas: [
    ['conta_id', 'apelido', 'tipo', 'entra_no_fechamento'],
    ['CC1', 'Conta corrente (Fernando)', 'corrente', 'Sim'],
    ['CC2', 'Conta corrente (Iris)', 'corrente', 'Sim'],
    ['CARD', 'Cartão', 'cartao', 'Não'],
  ],
  Categorias: [
    ['categoria_id', 'nome', 'tipo', 'ordem'],
    ['MOR', 'Moradia', 'despesa', 1], ['SUP', 'Supermercado', 'despesa', 2], ['TRA', 'Transporte', 'despesa', 3],
    ['SAU', 'Saúde', 'despesa', 4], ['EXT', 'Gastos Extras', 'despesa', 5], ['SAL', 'Salário', 'receita', 6],
    ['INT', 'Movimentação interna', 'interna', 7], ['REE', 'Reembolsos', 'reembolso', 8],
  ],
  Subcategorias: [
    ['subcategoria_id', 'categoria_id', 'nome'],
    ['MOR-03', 'MOR', 'Financiamento imobiliário'], ['MOR-04', 'MOR', 'Condomínio'], ['MOR-06', 'MOR', 'Energia elétrica'], ['MOR-17', 'MOR', 'Telefone'],
    ['SUP-02', 'SUP', 'Atacado e compras do mês'], ['SUP-12', 'SUP', 'Padaria'],
    ['TRA-04', 'TRA', 'Combustível'], ['TRA-02', 'TRA', 'Aplicativos e táxi'],
    ['SAU-12', 'SAU', 'Plano de saúde'], ['SAU-09', 'SAU', 'Medicamentos'],
    ['EXT-13', 'EXT', 'Restaurante'], ['EXT-02', 'EXT', 'Assinaturas e serviços digitais'],
    ['SAL-01', 'SAL', 'Salário'], ['INT-02', 'INT', 'Pagamento de fatura de cartão'], ['REE-01', 'REE', 'Reembolso recebido'],
  ],
}

export function demoTabs(today = new Date()) {
  const y = today.getUTCFullYear()
  const m0 = today.getUTCMonth()
  const lanc = [['lancamento_id', 'conta_id', 'pessoa_id', 'data', 'data_caixa', 'valor', 'descricao_limpa', 'subcategoria_id', 'tipo', 'status', 'parcela_n', 'parcela_total']]
  const orc = [['mes', 'subcategoria_id', 'pessoa_id', 'valor_planejado']]
  let n = 0
  const add = (d, conta, pessoa, valor, desc, sub, tipo, status = 'realizado') => {
    const iso = new Date(Date.UTC(d.y, d.m, d.d)).toISOString().slice(0, 10)
    lanc.push([`d${++n}`, conta, pessoa, iso, iso, valor, desc, sub, tipo, status, '', ''])
  }
  for (let k = 3; k >= 0; k--) {
    const dt = new Date(Date.UTC(y, m0 - k, 1))
    const yy = dt.getUTCFullYear(), mm = dt.getUTCMonth(), cur = k === 0
    const mes = `${yy}-${String(mm + 1).padStart(2, '0')}`
    const s = (base) => Math.round(base * (0.92 + ((k * 7 + base) % 17) / 100))
    const st = (day) => (cur && day > today.getUTCDate() ? 'pendente' : 'realizado')
    add({ y: yy, m: mm, d: 5 }, 'CC1', 'P01', 11500, 'Folha de pagamento', 'SAL-01', 'receita', st(5))
    add({ y: yy, m: mm, d: 6 }, 'CC2', 'P02', 7800, 'Salário', 'SAL-01', 'receita', st(6))
    add({ y: yy, m: mm, d: 8 }, 'CC1', 'FAM', -3900, 'Financiamento imobiliário', 'MOR-03', 'despesa', st(8))
    add({ y: yy, m: mm, d: 9 }, 'CC1', 'FAM', -s(1280), 'Condomínio', 'MOR-04', 'despesa', st(9))
    add({ y: yy, m: mm, d: 12 }, 'CC1', 'FAM', -s(310), 'Energia elétrica', 'MOR-06', 'despesa', st(12))
    add({ y: yy, m: mm, d: 14 }, 'CC1', 'P01', -s(112), 'Telefone', 'MOR-17', 'despesa', st(14))
    add({ y: yy, m: mm, d: 7 }, 'CARD', 'FAM', -s(1450), 'Mercado do mês', 'SUP-02', 'despesa', st(7))
    add({ y: yy, m: mm, d: 19 }, 'CARD', 'FAM', -s(420), 'Mercado', 'SUP-02', 'despesa', st(19))
    add({ y: yy, m: mm, d: 11 }, 'CARD', 'P01', -s(380), 'Combustível', 'TRA-04', 'despesa', st(11))
    add({ y: yy, m: mm, d: 21 }, 'CARD', 'P02', -s(95), 'Aplicativo de transporte', 'TRA-02', 'despesa', st(21))
    add({ y: yy, m: mm, d: 10 }, 'CC1', 'FAM', -1850, 'Plano de saúde', 'SAU-12', 'despesa', st(10))
    add({ y: yy, m: mm, d: 17 }, 'CARD', 'P02', -s(140), 'Farmácia', 'SAU-09', 'despesa', st(17))
    add({ y: yy, m: mm, d: 15 }, 'CARD', 'FAM', -s(360), 'Restaurante', 'EXT-13', 'despesa', st(15))
    add({ y: yy, m: mm, d: 3 }, 'CARD', 'P01', -110, 'Assinaturas', 'EXT-02', 'despesa', st(3))
    add({ y: yy, m: mm, d: 13 }, 'CC1', 'P01', 135.79, 'Reembolso', 'REE-01', 'reembolso', st(13))
    add({ y: yy, m: mm, d: 20 }, 'CC1', 'P01', -(2300 + s(500)), 'Pagamento da fatura', 'INT-02', 'pagto_fatura', st(20))
    for (const [sub, p, v] of [['MOR-03', 'FAM', 3900], ['MOR-04', 'FAM', 1300], ['MOR-06', 'FAM', 300], ['SUP-02', 'FAM', 1900], ['TRA-04', 'P01', 400], ['SAU-12', 'FAM', 1850], ['EXT-13', 'FAM', 300]]) orc.push([mes, sub, p, v])
  }
  return { ...H, Lancamentos: lanc, Orcamento: orc }
}
