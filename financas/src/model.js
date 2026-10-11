// Lógica pura do Caixa Central: lê as abas da planilha e calcula os totais.
// Sem React e sem rede, para poder ser testada com `npm test`.

import { iconFor } from './icons.js'

const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

export const toNumber = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  let s = String(v ?? '').replace(/R\$|\s/g, '')
  if (!s) return 0
  const neg = /^\(.*\)$/.test(s)
  s = s.replace(/[()]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? (neg ? -n : n) : 0
}

// Aceita número de série do Sheets, dd/mm/aaaa e aaaa-mm-dd. Devolve 'aaaa-mm-dd' ou null.
export const toIsoDate = (v) => {
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10)
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

// Mês como 'aaaa-mm': aceita data, 'aaaa-mm' e 'mm/aaaa'.
export const toMonth = (v) => {
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{4})-(\d{2})$/)
  if (m) return s
  m = s.match(/^(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`
  return toIsoDate(v)?.slice(0, 7) ?? null
}

export const rowsToObjects = (values = []) => {
  const [head = [], ...rows] = values
  const keys = head.map((h) => strip(h))
  return rows
    .filter((r) => r.some((c) => String(c ?? '').trim() !== ''))
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ''])))
}

const isSim = (v) => strip(v) === 'sim'
export const statusOf = (s) => {
  const k = strip(s)
  return k === 'pendente' || k === 'planejado' ? k : 'realizado'
}

const TIPO_ICONE = { transferencia: 'transfer', pagto_fatura: 'card', investimento: 'trend', reembolso: 'undo' }
export const TIPOS = ['receita', 'despesa', 'reembolso', 'transferencia', 'pagto_fatura', 'investimento']

export function buildData(tabs = {}) {
  const pessoas = rowsToObjects(tabs.Pessoas).map((p) => ({ id: String(p.pessoa_id), nome: String(p.nome) })).filter((p) => p.id)
  const bancos = new Map(
    rowsToObjects(tabs.Bancos).map((b) => {
      const nome = String(b.nome || b.banco_id)
      return [String(b.banco_id), { id: String(b.banco_id), nome, sigla: String(b.sigla || '').trim() || nome.slice(0, 2).toUpperCase(), cor: String(b.cor || '').trim(), logo: String(b.logo_url || '').trim() }]
    }),
  )
  const contas = rowsToObjects(tabs.Contas).map((c) => ({
    id: String(c.conta_id),
    apelido: String(c.apelido || c.conta_id),
    tipo: strip(c.tipo),
    fechamento: isSim(c.entra_no_fechamento),
    banco: bancos.get(String(c.banco_id)) ?? null,
  }))
  const categorias = rowsToObjects(tabs.Categorias)
    .map((c) => ({ id: String(c.categoria_id), nome: String(c.nome), tipo: strip(c.tipo), ordem: toNumber(c.ordem), icone: String(c.icone || '') }))
    .sort((a, b) => a.ordem - b.ordem)
  const catById = new Map(categorias.map((c) => [c.id, c]))
  const subcategorias = rowsToObjects(tabs.Subcategorias).map((s) => ({ id: String(s.subcategoria_id), categoria: String(s.categoria_id), nome: String(s.nome), icone: String(s.icone || '') }))
  const subById = new Map(subcategorias.map((s) => [s.id, s]))
  const contaById = new Map(contas.map((c) => [c.id, c]))

  const lancamentos = rowsToObjects(tabs.Lancamentos)
    .map((l) => {
      const data = toIsoDate(l.data)
      if (!data) return null
      const sub = subById.get(String(l.subcategoria_id))
      return {
        id: String(l.lancamento_id),
        conta: String(l.conta_id),
        pessoa: String(l.pessoa_id),
        data,
        dataCaixa: toIsoDate(l.data_caixa) ?? data,
        valor: toNumber(l.valor),
        desc: String(l.descricao_limpa || l.descricao_original || ''),
        sub: sub?.id ?? '',
        subNome: sub?.nome ?? '',
        categoria: sub?.categoria ?? '',
        categoriaNome: catById.get(sub?.categoria)?.nome ?? 'Sem categoria',
        tipo: strip(l.tipo),
        status: statusOf(l.status),
        parcela: l.parcela_total ? `${l.parcela_n}/${l.parcela_total}` : '',
        contaNome: contaById.get(String(l.conta_id))?.apelido ?? String(l.conta_id),
        banco: contaById.get(String(l.conta_id))?.banco ?? null,
        icone: sub ? iconFor(sub.icone, catById.get(sub.categoria)?.icone, sub.categoria) : TIPO_ICONE[strip(l.tipo)] ?? 'alert',
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))

  const orcamento = rowsToObjects(tabs.Orcamento)
    .map((o) => ({ mes: toMonth(o.mes), sub: String(o.subcategoria_id), pessoa: String(o.pessoa_id), valor: toNumber(o.valor_planejado) }))
    .filter((o) => o.mes && o.sub)

  return { pessoas, contas, bancos, categorias, subcategorias, lancamentos, orcamento, catById, subById }
}

const zero = () => ({ realizado: 0, pendente: 0, planejado: 0 })
const soma = (t) => t.realizado + t.pendente + t.planejado
const inScope = (pessoa) => (x) => pessoa === 'TODOS' || x.pessoa === pessoa

// Resultado do mês (competência): receitas menos despesas, com reembolso abatendo despesa.
// Transferência, pagamento de fatura e investimento ficam de fora de propósito.
export function summarizeMonth(data, { month, pessoa = 'TODOS' }) {
  const scope = inScope(pessoa)
  const receitas = zero()
  const despesas = zero()
  const reembolsos = zero()
  const cats = new Map()
  const catOf = (id, nome) => {
    if (!cats.has(id)) cats.set(id, { id, nome, icone: iconFor(null, data.catById.get(id)?.icone, id), ...zero(), orcado: 0, subs: new Map() })
    return cats.get(id)
  }
  const subOf = (c, id, nome) => {
    if (!c.subs.has(id)) c.subs.set(id, { id, nome, icone: iconFor(data.subById.get(id)?.icone, c.icone, c.id), ...zero(), orcado: 0 })
    return c.subs.get(id)
  }

  for (const l of data.lancamentos) {
    if (!scope(l) || !l.data.startsWith(month)) continue
    if (l.tipo === 'receita') receitas[l.status] += l.valor
    else if (l.tipo === 'reembolso') reembolsos[l.status] += l.valor
    else if (l.tipo === 'despesa') {
      const v = -l.valor
      despesas[l.status] += v
      const c = catOf(l.categoria || '_sem', l.categoriaNome)
      c[l.status] += v
      subOf(c, l.sub || '_sem', l.subNome || 'Sem subcategoria')[l.status] += v
    }
  }
  for (const o of data.orcamento) {
    if (o.mes !== month || !scope(o)) continue
    const sub = data.subById.get(o.sub)
    if (!sub) continue
    const cat = data.catById.get(sub.categoria)
    if (cat?.tipo !== 'despesa') continue
    const c = catOf(cat.id, cat.nome)
    c.orcado += o.valor
    subOf(c, sub.id, sub.nome).orcado += o.valor
  }

  const ordem = new Map(data.categorias.map((c, i) => [c.id, i]))
  const categorias = [...cats.values()]
    .map((c) => ({ ...c, subs: [...c.subs.values()].sort((a, b) => soma(b) - soma(a)) }))
    .sort((a, b) => (ordem.get(a.id) ?? 99) - (ordem.get(b.id) ?? 99))

  const liquida = {
    realizado: despesas.realizado - reembolsos.realizado,
    pendente: despesas.pendente - reembolsos.pendente,
    planejado: despesas.planejado - reembolsos.planejado,
  }
  const resultado = {
    realizado: receitas.realizado - liquida.realizado,
    previsto: soma(receitas) - soma(liquida),
  }

  // Fechamento: só movimento real das contas marcadas com entra_no_fechamento = Sim, pela data de caixa.
  const fecha = new Set(data.contas.filter((c) => c.fechamento).map((c) => c.id))
  const caixa = { entradas: 0, saidas: 0, pendente: 0 }
  for (const l of data.lancamentos) {
    if (!scope(l) || !fecha.has(l.conta) || !l.dataCaixa.startsWith(month)) continue
    if (l.status === 'realizado') l.valor >= 0 ? (caixa.entradas += l.valor) : (caixa.saidas += -l.valor)
    else if (l.status === 'pendente') caixa.pendente += l.valor
  }
  caixa.liquido = caixa.entradas - caixa.saidas

  const orcado = categorias.reduce((a, c) => a + c.orcado, 0)
  return { receitas, despesas, reembolsos, liquida, resultado, categorias, caixa, orcado, total: soma }
}

export const months = (year) => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)

// Tabela anual: despesas por categoria e mês, receitas e resultado.
export function summarizeYear(data, { year, pessoa = 'TODOS' }) {
  const ms = months(year)
  const por = ms.map((month) => summarizeMonth(data, { month, pessoa }))
  const catIds = new Map()
  const catIcon = new Map()
  por.forEach((s) => s.categorias.forEach((c) => { catIds.set(c.id, c.nome); catIcon.set(c.id, c.icone) }))
  const ordem = new Map(data.categorias.map((c, i) => [c.id, i]))
  const linhas = [...catIds.entries()]
    .sort((a, b) => (ordem.get(a[0]) ?? 99) - (ordem.get(b[0]) ?? 99))
    .map(([id, nome]) => ({
      id,
      nome,
      icone: catIcon.get(id),
      celulas: por.map((s) => {
        const c = s.categorias.find((x) => x.id === id)
        return { r: c?.realizado ?? 0, p: (c?.pendente ?? 0) + (c?.planejado ?? 0) }
      }),
    }))
  const linha = (f) => por.map(f)
  return {
    meses: ms,
    linhas,
    receitas: linha((s) => s.receitas.realizado),
    reembolsos: linha((s) => s.reembolsos.realizado),
    resultado: linha((s) => s.resultado.realizado),
  }
}

export const monthsWithData = (data) => [...new Set(data.lancamentos.map((l) => l.data.slice(0, 7)))].sort()
