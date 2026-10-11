// Lógica pura do Caixa: lê as abas da planilha e calcula os totais. Sem React e sem rede.

const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
const sim = (v) => strip(v) === 'sim'

export const toNumber = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  let s = String(v ?? '').replace(/R\$|\s/g, '')
  if (!s) return 0
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

// dd/mm/aaaa, aaaa-mm-dd ou número de série do Sheets -> 'aaaa-mm-dd' (ou null).
export const toIsoDate = (v) => {
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10)
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

// Linhas da aba -> objetos com chaves sem acento. `_row` é o número da linha na planilha (para gravar).
export const rowsToObjects = (values = []) => {
  const [head = [], ...rows] = values
  const keys = head.map(strip)
  return rows
    .map((r, i) => ({ r, row: i + 2 }))
    .filter(({ r }) => r.some((c) => String(c ?? '').trim() !== ''))
    .map(({ r, row }) => ({ ...Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ''])), _row: row }))
}

export const colunaDe = (values, nome) => {
  const i = (values?.[0] ?? []).findIndex((h) => strip(h) === strip(nome))
  if (i < 0) throw new Error(`Coluna ${nome} não encontrada`)
  let n = i + 1, s = ''
  while (n > 0) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26) }
  return s
}

// Subcategorias internas definem o tipo do lançamento; as demais seguem a natureza da categoria.
const TIPO_POR_SUB = { 'INT-01': 'transferencia', 'INT-02': 'pagto_fatura', 'INT-03': 'investimento', 'INT-04': 'investimento', 'REE-01': 'reembolso' }
export const tipoParaSub = (subId, categoria) => {
  if (TIPO_POR_SUB[subId]) return TIPO_POR_SUB[subId]
  return categoria?.tipo === 'receita' ? 'receita' : 'despesa'
}

export function buildData(tabs = {}) {
  const pessoas = rowsToObjects(tabs.Pessoas).filter((p) => sim(p.ativa) || p.ativa === '')
    .map((p) => ({ id: String(p.pessoa_id), nome: String(p.nome) }))
  const contas = rowsToObjects(tabs.Contas).map((c) => ({
    id: String(c.conta_id), apelido: String(c.apelido || c.conta_id), tipo: strip(c.tipo), fechamento: sim(c.entra_no_fechamento), pessoa: String(c.pessoa_id || ''),
  }))
  const categorias = rowsToObjects(tabs.Categorias).map((c) => ({ id: String(c.categoria_id), nome: String(c.nome), tipo: strip(c.tipo), ordem: toNumber(c.ordem) })).sort((a, b) => a.ordem - b.ordem)
  const catById = new Map(categorias.map((c) => [c.id, c]))
  const subcategorias = rowsToObjects(tabs.Subcategorias).filter((s) => sim(s.ativa) || s.ativa === '')
    .map((s) => ({ id: String(s.subcategoria_id), categoria: String(s.categoria_id), nome: String(s.nome) }))
  const subById = new Map(subcategorias.map((s) => [s.id, s]))
  const contaById = new Map(contas.map((c) => [c.id, c]))

  const lancamentos = rowsToObjects(tabs.Lancamentos).map((l) => {
    const data = toIsoDate(l.data)
    if (!data) return null
    const sub = subById.get(String(l.subcategoria_id))
    const conta = contaById.get(String(l.conta_id))
    const dataCaixa = toIsoDate(l.data_caixa) ?? data
    const status = ['pendente', 'planejado'].includes(strip(l.status)) ? strip(l.status) : 'realizado'
    return {
      id: String(l.lancamento_id), row: l._row, conta: String(l.conta_id), contaNome: conta?.apelido ?? String(l.conta_id),
      pessoa: String(l.pessoa_id), data, dataCaixa, valor: toNumber(l.valor),
      desc: String(l.descricao_limpa || l.descricao_original || ''), original: String(l.descricao_original || ''),
      sub: String(l.subcategoria_id), subNome: sub?.nome ?? '', categoria: sub?.categoria ?? '',
      categoriaNome: catById.get(sub?.categoria)?.nome ?? 'Sem categoria',
      semCategoria: !sub || String(l.subcategoria_id).startsWith('SEM-'),
      tipo: strip(l.tipo), status, revisado: sim(l.revisado),
      // Cartão conta na data da compra; conta corrente, na data em que o dinheiro saiu.
      competencia: (conta?.tipo === 'cartao' ? data : dataCaixa).slice(0, 7),
    }
  }).filter(Boolean).sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))

  const fixas = rowsToObjects(tabs.ContasFixas).filter((f) => f.ativa === '' || sim(f.ativa)).map((f) => ({
    id: String(f.conta_fixa_id), row: f._row, desc: String(f.descricao), sub: String(f.subcategoria_id), pessoa: String(f.pessoa_id),
    pagador: String(f.pagador), forma: strip(f.forma_pagamento),
    padrao: String(f.valor_padrao).trim() === '' ? null : toNumber(f.valor_padrao),
    mes: String(f.valor_mes).trim() === '' ? null : toNumber(f.valor_mes),
    dia: String(f.dia_vencimento).trim() === '' ? null : toNumber(f.dia_vencimento),
    pago: sim(f.pago), obs: String(f.obs ?? ''),
  }))

  return { pessoas, contas, categorias, subcategorias, lancamentos, fixas, meta: toNumber(tabs.metaFixas) }
}

const mostra = (l, pessoa) => pessoa === 'todos' || (pessoa === 'FAM' ? l.pessoa === 'FAM' : l.pessoa === pessoa)

// Resultado = receitas − despesas. Reembolso abate despesa. Transferência, fatura e investimento ficam de fora.
export function resumoDoMes(lancamentos, mes, pessoa = 'todos') {
  const r = { receitas: 0, despesas: 0, reembolsos: 0, aSair: 0, aEntrar: 0, semCategoria: 0, porCategoria: new Map() }
  for (const l of lancamentos) {
    if (l.competencia !== mes || !mostra(l, pessoa)) continue
    if (l.semCategoria && l.status === 'realizado' && ['despesa', 'receita'].includes(l.tipo)) r.semCategoria++
    if (!['receita', 'despesa', 'reembolso'].includes(l.tipo)) continue
    if (l.status !== 'realizado') {
      if (l.tipo === 'despesa') r.aSair += Math.abs(l.valor)
      else if (l.tipo === 'receita') r.aEntrar += l.valor
      continue
    }
    if (l.tipo === 'receita') r.receitas += l.valor
    else if (l.tipo === 'reembolso') r.reembolsos += l.valor
    else {
      const v = Math.abs(l.valor)
      r.despesas += v
      r.porCategoria.set(l.categoriaNome, (r.porCategoria.get(l.categoriaNome) ?? 0) + v)
    }
  }
  r.despesasLiquidas = r.despesas - r.reembolsos
  r.resultado = r.receitas - r.despesasLiquidas
  r.categorias = [...r.porCategoria].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor)
  return r
}

export const mesesDisponiveis = (lancamentos) => [...new Set(lancamentos.map((l) => l.competencia))].sort().reverse()

export const valorDaFixa = (f) => f.mes ?? f.padrao ?? 0

// Itens no cartão já estão dentro da fatura: não entram de novo na soma a pagar.
export function resumoFixas(fixas, meta = 0) {
  const fora = fixas.filter((f) => f.forma !== 'cartao')
  const total = fora.reduce((s, f) => s + valorDaFixa(f), 0)
  const pago = fora.filter((f) => f.pago).reduce((s, f) => s + valorDaFixa(f), 0)
  const semValor = fixas.filter((f) => f.padrao === null && f.mes === null).length
  return { total, pago, restante: total - pago, meta, folga: meta ? meta - total : null, semValor, quantidade: fora.length, quitadas: fora.filter((f) => f.pago).length }
}

// Próximos vencimentos a partir de hoje (dia do mês). Atrasados ficam no topo.
export function proximosVencimentos(fixas, diaHoje) {
  return fixas.filter((f) => !f.pago && f.forma !== 'cartao' && f.dia && valorDaFixa(f) > 0)
    .map((f) => ({ ...f, atrasada: f.dia < diaHoje }))
    .sort((a, b) => a.dia - b.dia)
}
