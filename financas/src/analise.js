// Análises sobre os dados já carregados: saldos, vencimentos, fluxo projetado, revisão,
// metas, dívidas e patrimônio. Funções puras, testadas em test/analise.test.mjs.

import { summarizeMonth } from './model.js'
import { iconFor } from './icons.js'

const inScope = (pessoa) => (x) => pessoa === 'TODOS' || x.pessoa === pessoa
const pad = (n) => String(n).padStart(2, '0')
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()
const addMonths = (ym, d) => {
  const [y, m] = ym.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1 + d, 1))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}`
}
const isoToday = () => new Date().toISOString().slice(0, 10)
const r2 = (v) => Math.round(v * 100) / 100

// Saldo de cada conta que tem saldo inicial: saldo inicial + movimento realizado depois da data do saldo.
export function saldos(data, { pessoa = 'TODOS' } = {}) {
  const scope = inScope(pessoa)
  return data.contas
    .filter((c) => c.tipo !== 'cartao' && (pessoa === 'TODOS' || c.pessoa === pessoa))
    .map((c) => {
      if (c.saldoInicial === null) return { conta: c, saldo: null }
      let s = c.saldoInicial
      for (const l of data.lancamentos) {
        if (l.conta !== c.id || l.status !== 'realizado' || !scope(l)) continue
        if (c.dataSaldo && l.dataCaixa <= c.dataSaldo) continue
        s += l.valor
      }
      return { conta: c, saldo: r2(s) }
    })
}

// Última posição de cada ativo (por conta e ativo) informada na aba Posicoes.
export function posicoesAtuais(data, { pessoa = 'TODOS' } = {}) {
  const ult = new Map()
  for (const p of data.posicoes) {
    if (!inScope(pessoa)(p)) continue
    const k = `${p.conta}|${p.ativo}`
    if (!ult.has(k) || ult.get(k).data < p.data) ult.set(k, p)
  }
  return [...ult.values()]
}

// Aportes líquidos em investimento (aporte positivo, resgate negativo), no total e por mês.
export function aportes(data, { pessoa = 'TODOS' } = {}) {
  const por = new Map()
  let total = 0
  for (const l of data.lancamentos) {
    if (l.tipo !== 'investimento' || l.status !== 'realizado' || !inScope(pessoa)(l)) continue
    const m = l.data.slice(0, 7)
    por.set(m, (por.get(m) ?? 0) - l.valor)
    total -= l.valor
  }
  return { total: r2(total), meses: [...por.entries()].sort().map(([mes, valor]) => ({ mes, valor: r2(valor) })) }
}

export function dividasResumo(data, { pessoa = 'TODOS', hoje = isoToday() } = {}) {
  return data.dividas
    .filter(inScope(pessoa))
    .map((d) => ({ ...d, quitacao: d.restantes > 0 ? addMonths(hoje.slice(0, 7), d.restantes) : null, restoParcelas: r2(d.parcela * d.restantes) }))
}

export function patrimonio(data, { pessoa = 'TODOS', hoje = isoToday() } = {}) {
  const contas = saldos(data, { pessoa })
  const liquidez = contas.filter((x) => x.saldo !== null && x.conta.tipo !== 'investimento').reduce((a, x) => a + x.saldo, 0)
  const posicoes = posicoesAtuais(data, { pessoa })
  const investido = posicoes.reduce((a, p) => a + p.liquido, 0) + contas.filter((x) => x.saldo !== null && x.conta.tipo === 'investimento').reduce((a, x) => a + x.saldo, 0)
  const dividas = dividasResumo(data, { pessoa, hoje })
  const devido = dividas.reduce((a, d) => a + (d.saldo ?? 0), 0)
  return {
    contas,
    posicoes,
    liquidez: r2(liquidez),
    investido: r2(investido),
    devido: r2(devido),
    liquido: r2(liquidez + investido - devido),
    dividaSemSaldo: dividas.some((d) => d.saldo === null),
    contaSemSaldo: contas.some((x) => x.saldo === null),
  }
}

export function metasResumo(data, { pessoa = 'TODOS', hoje = isoToday() } = {}) {
  return data.metas.filter(inScope(pessoa)).map((m) => {
    const falta = Math.max(0, m.alvo - m.atual)
    let mensal = null
    if (m.prazo && falta > 0) {
      const meses = (Number(m.prazo.slice(0, 4)) - Number(hoje.slice(0, 4))) * 12 + Number(m.prazo.slice(5, 7)) - Number(hoje.slice(5, 7))
      mensal = meses > 0 ? r2(falta / meses) : falta
    }
    return { ...m, falta, pct: Math.min(1, m.atual / m.alvo), mensal }
  })
}

// Revisão: lançamentos de receita ou despesa sem subcategoria, agrupados pela descrição.
export function revisao(data, { pessoa = 'TODOS' } = {}) {
  const grupos = new Map()
  for (const l of data.lancamentos) {
    if (l.sub || (l.tipo !== 'receita' && l.tipo !== 'despesa') || !inScope(pessoa)(l)) continue
    const chave = l.desc.trim().toUpperCase()
    if (!grupos.has(chave)) grupos.set(chave, { desc: l.desc.trim(), n: 0, total: 0, ultima: '', ids: [] })
    const g = grupos.get(chave)
    g.n += 1
    g.total += l.valor
    g.ids.push(l.id)
    if (l.data > g.ultima) g.ultima = l.data
  }
  const lista = [...grupos.values()].map((g) => ({ ...g, total: r2(g.total), sugestao: g.desc.toUpperCase().split(/\s+/).slice(0, 4).join(' ') }))
  lista.sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
  return { grupos: lista, linhas: lista.reduce((a, g) => a + g.n, 0), total: r2(lista.reduce((a, g) => a + Math.abs(g.total), 0)) }
}

// Ocorrências futuras entre duas datas (inclusive): recorrências e lançamentos pendentes/planejados.
// Uma recorrência já paga no mês (lançamento realizado da mesma subcategoria, valor parecido) não aparece.
export function ocorrencias(data, { de, ate, pessoa = 'TODOS' }) {
  const scope = inScope(pessoa)
  const out = []
  for (const l of data.lancamentos) {
    if (l.status === 'realizado' || !scope(l) || l.data < de || l.data > ate) continue
    if (l.tipo === 'transferencia') continue
    out.push({ data: l.data, desc: l.desc, valor: l.valor, origem: 'agendado', sub: l.sub, icone: l.icone, tipo: l.tipo })
  }
  const usados = new Set()
  for (let ym = de.slice(0, 7); ym <= ate.slice(0, 7); ym = addMonths(ym, 1)) {
    const [y, m] = ym.split('-').map(Number)
    for (const r of data.recorrencias) {
      if (!scope(r)) continue
      if (r.periodicidade === 'anual' && r.inicio && Number(r.inicio.slice(5, 7)) !== m) continue
      const data_ = `${ym}-${pad(Math.min(r.dia, daysIn(y, m)))}`
      if (data_ < de || data_ > ate) continue
      if ((r.inicio && data_ < r.inicio) || (r.fim && data_ > r.fim)) continue
      const paga = data.lancamentos.find(
        (l) => !usados.has(l.id) && l.tipo !== 'transferencia' && l.sub === r.sub && l.data.startsWith(ym) && Math.sign(l.valor) === Math.sign(r.valor) && Math.abs(l.valor) >= Math.abs(r.valor) * 0.4 && Math.abs(l.valor) <= Math.abs(r.valor) * 1.6,
      )
      if (paga) {
        usados.add(paga.id)
        continue
      }
      out.push({ data: data_, desc: r.desc, valor: r.valor, origem: 'recorrencia', sub: r.sub, icone: r.icone, tipo: r.valor >= 0 ? 'receita' : 'despesa' })
    }
  }
  return out.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
}

export function vencimentos(data, { hoje = isoToday(), dias = 30, pessoa = 'TODOS' } = {}) {
  const fim = new Date(Date.parse(`${hoje}T12:00:00Z`) + dias * 86400000).toISOString().slice(0, 10)
  const atrasados = data.lancamentos
    .filter((l) => l.status === 'pendente' && l.data < hoje && inScope(pessoa)(l))
    .map((l) => ({ data: l.data, desc: l.desc, valor: l.valor, origem: 'agendado', icone: l.icone, tipo: l.tipo, atrasado: true }))
  return [...atrasados, ...ocorrencias(data, { de: hoje, ate: fim, pessoa })]
}

// Média mensal (3 meses completos anteriores) das despesas realizadas nas contas do fechamento que
// não têm recorrência cadastrada: é o gasto variável que a projeção precisa estimar.
export function gastoVariavelMedio(data, { hoje = isoToday(), pessoa = 'TODOS', janela = 3 } = {}) {
  const fecha = new Set(data.contas.filter((c) => c.fechamento).map((c) => c.id))
  const fixos = new Set(data.recorrencias.map((r) => r.sub).filter(Boolean))
  const meses = []
  for (let i = 1; i <= janela; i++) meses.push(addMonths(hoje.slice(0, 7), -i))
  let total = 0
  let n = 0
  for (const m of meses) {
    let soma = 0
    let tem = false
    for (const l of data.lancamentos) {
      if (!l.dataCaixa.startsWith(m) || !fecha.has(l.conta) || !inScope(pessoa)(l)) continue
      tem = true
      if (l.tipo === 'despesa' && l.status === 'realizado' && !fixos.has(l.sub)) soma -= l.valor
    }
    if (tem) { total += soma; n += 1 }
  }
  return n ? r2(total / n) : 0
}

// Fluxo projetado: saldo atual das contas do fechamento + compromissos conhecidos mês a mês.
// Não inclui faturas de cartão nem gastos variáveis ainda não lançados.
export function fluxo(data, { hoje = isoToday(), meses = 6, pessoa = 'TODOS' } = {}) {
  const contas = saldos(data, { pessoa }).filter((x) => x.conta.fechamento && x.saldo !== null)
  const inicial = r2(contas.reduce((a, x) => a + x.saldo, 0))
  const ultimo = addMonths(hoje.slice(0, 7), meses - 1)
  const itens = ocorrencias(data, { de: hoje, ate: `${ultimo}-${pad(daysIn(...ultimo.split('-').map(Number)))}`, pessoa })
  const variavel = gastoVariavelMedio(data, { hoje, pessoa })
  let saldo = inicial
  const lista = []
  for (let ym = hoje.slice(0, 7); ym <= ultimo; ym = addMonths(ym, 1)) {
    const doMes = itens.filter((i) => i.data.startsWith(ym))
    const entradas = doMes.filter((i) => i.valor > 0).reduce((a, i) => a + i.valor, 0)
    const fixas = doMes.filter((i) => i.valor < 0).reduce((a, i) => a - i.valor, 0)
    const [y, m] = ym.split('-').map(Number)
    const resta = ym === hoje.slice(0, 7) ? (daysIn(y, m) - Number(hoje.slice(8, 10))) / daysIn(y, m) : 1
    const vari = r2(variavel * resta)
    const saidas = fixas + vari
    saldo = r2(saldo + entradas - saidas)
    lista.push({ mes: ym, entradas: r2(entradas), saidas: r2(saidas), variavel: vari, final: saldo, itens: doMes })
  }
  const minimo = lista.reduce((a, m) => Math.min(a, m.final), inicial)
  return { inicial, meses: lista, minimo, variavel, semSaldo: contas.length === 0 }
}

// Sugestão de orçamento: média das despesas realizadas por categoria nos meses anteriores com movimento.
export function sugestaoOrcamento(data, { month, pessoa = 'TODOS', janela = 3 }) {
  const medias = new Map()
  const usados = []
  for (let i = 1; i <= janela; i++) {
    const m = addMonths(month, -i)
    const s = summarizeMonth(data, { month: m, pessoa })
    if (s.despesas.realizado === 0) continue
    usados.push(m)
    for (const c of s.categorias) {
      if (c.id === '_sem') continue
      const cur = medias.get(c.id) ?? { id: c.id, nome: c.nome, icone: c.icone, soma: 0 }
      cur.soma += c.realizado
      medias.set(c.id, cur)
    }
  }
  const n = usados.length
  const itens = [...medias.values()].map((c) => ({ id: c.id, nome: c.nome, icone: c.icone || iconFor(null, null, c.id), media: r2(c.soma / n) })).filter((c) => c.media > 0)
  itens.sort((a, b) => b.media - a.media)
  return { meses: usados, itens, total: r2(itens.reduce((a, c) => a + c.media, 0)) }
}
