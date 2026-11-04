// Apresentar: catálogo de setores e itens, variações por período, frases e roteiro dos slides.
import test from 'node:test'
import assert from 'node:assert/strict'
import { ITENS, ITEM_IDS, PERIODOS, SETORES_APRESENTACAO, TRANSVERSAIS, dadoItem, emReais, itensDaMontagem, itensPadrao, linhasCenario, montarRoteiro, normalizarCapa, resumoFinal, sinal, variacaoPeriodo } from '../src/apresentacao.js'
import { INSUMOS } from '../src/insumos.js'
import { parseCommand } from '../src/terminal.js'

const DIA = 864e5
const agora = Date.parse('2026-11-04T18:00:00Z')
const diaria = (n, de, ate) => Array.from({ length: n }, (_, i) => ({ t: agora - (n - 1 - i) * DIA, v: de + ((ate - de) * i) / (n - 1) }))

test('catálogo: todo setor tem cadeia, perguntas e itens conhecidos; os padrão nunca incluem planejados', () => {
  assert.ok(SETORES_APRESENTACAO.length >= 15)
  for (const s of SETORES_APRESENTACAO) {
    assert.ok(s.cadeia.entradas.length >= 2 && s.cadeia.saidas.length >= 2 && s.cadeia.processo, s.id)
    assert.ok(s.perguntas.length >= 2, s.id)
    for (const id of s.itens) assert.ok(ITENS[id], `${s.id}: item ${id} não existe`)
    const padrao = itensPadrao(s.id)
    assert.ok(padrao.includes('usd'), `${s.id}: dólar entra por padrão`)
    assert.ok(padrao.every((id) => ITENS[id].tipo !== 'planejado'))
    assert.equal(new Set(padrao).size, padrao.length)
  }
  for (const id of ITEM_IDS) if (ITENS[id].insumo) assert.ok(INSUMOS.some((i) => i.id === ITENS[id].insumo), `${id}: insumo ${ITENS[id].insumo}`)
  assert.deepEqual(TRANSVERSAIS, ['usd'])
  // montagem: padrão primeiro, depois os demais, planejados do setor por último e desligados
  const lista = itensDaMontagem('alimentos')
  assert.ok(lista.slice(0, itensPadrao('alimentos').length).every((i) => i.padrao))
  assert.ok(lista.filter((i) => i.tipo === 'planejado').every((i) => !i.padrao))
  assert.ok(lista.some((i) => i.id === 'trigo' && i.tipo === 'planejado'))
  assert.deepEqual(parseCommand('apresentar'), { kind: 'tab', id: 'apresentar', sub: '' })
})

test('variação por período exige cobertura: série curta não vira "6 meses"', () => {
  const pts = diaria(200, 5, 5.5)
  const v = variacaoPeriodo(pts, 180, agora)
  assert.ok(v && Math.abs(v.pct - ((5.5 - pts[pts.length - 181].v) / pts[pts.length - 181].v) * 100) < 1e-9)
  assert.equal(variacaoPeriodo(diaria(20, 5, 5.5), 180, agora), null)
  assert.equal(variacaoPeriodo([{ t: agora, v: 1 }], 90, agora), null)
  // série mensal: folga maior (o ponto do mês cai no dia 15)
  const mensal = [['2026-04', 100], ['2026-05', 110], ['2026-06', 120], ['2026-07', 130], ['2026-08', 140], ['2026-09', 150]].map(([p, v]) => ({ t: Date.parse(`${p}-15T12:00:00Z`), v }))
  assert.equal(variacaoPeriodo(mensal, 360, agora, 35), null) // a série começa 5 meses depois do início da janela
  assert.ok(Math.abs(variacaoPeriodo(mensal, 180, agora, 35).pct - 36.3636) < 0.01)
  assert.equal(sinal(-3.456), '−3,5%')
  assert.equal(sinal(0.04), '0,0%')
  assert.ok(Math.abs(emReais(-8, 5.2) - (-3.216)) < 1e-9)
  assert.equal(emReais(null, 5), null)
})

const hist = { series: { USD: { points: diaria(400, 5, 5.25).map((p) => ({ t: p.t, bid: p.v })) }, EUR: { points: diaria(400, 5.8, 6.2).map((p) => ({ t: p.t, bid: p.v })) } } }
const quotes = { USD: { bid: 5.25, pct: 0.3, timestamp: agora, source: 'USD' }, EUR: { bid: 6.2, pct: -0.1, timestamp: agora, source: 'EUR' }, CNH: { bid: 0.74, pct: 0.0, timestamp: agora, fallback: true } }
const meses = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']
const commodities = [{ id: 'iron-ore', value: 97.7, period: '2026-09', benchmark: '62% Fe', sourceName: 'Pink Sheet', variationPct: 1.45, history: meses.map((p, i) => ({ period: p, value: 110 - i })) }]
const oil = { benchmark: 'Brent', value: 115.22, observationDate: '2026-10-20', points: diaria(300, 70, 115.22).map((p) => ({ date: new Date(p.t).toISOString().slice(0, 10), value: p.v })) }
const temas = { 'moeda-usd': { items: [{ t: agora - 3600e3, title: 'Dólar sobe com Fed', source: 'Valor', link: 'https://x/1' }, { t: agora - 7200e3, title: 'Outra', source: 'Reuters', link: 'https://x/2' }] }, minerio: { items: [] } }
const macro = { selic: [[agora - DIA, 14.25]], cdi: [[agora, 14.15]], focus: { date: '2026-10-30', rows: [{ indicator: 'Selic', values: { 2026: { median: 12.5 } } }, { indicator: 'IPCA', values: { 2026: { median: 4.52 } } }] } }
const dados = { quotes, hist, commodities, diario: null, oil, frete: { points: [{ period: '2026-03', value: 500 }, { period: '2026-09', value: 534.8 }] }, temas, macro, ipca: { points: [{ period: '2026-09', y12: 6.84 }] }, agora }
const seis = PERIODOS[1]

test('dado do item: moeda com cotação e período, commodity em dólar e em reais, Brent, frete, aço só matérias', () => {
  const usd = dadoItem(ITENS.usd, dados, seis)
  assert.equal(usd.valorTexto, 'R$ 5,25')
  assert.equal(usd.dia, 0.3)
  assert.ok(usd.periodo && usd.periodo.pct > 0)
  assert.match(usd.frase, /^Dólar a R\$ 5,25: \+\d+,\d% em 6 meses\.$/)
  assert.ok(usd.pontos.length >= 170 && usd.pontos.length <= 181)
  const cnh = dadoItem(ITENS.cnh, dados, seis)
  assert.equal(cnh.dia, null) // referência de reserva: sem variação do dia
  assert.match(cnh.frase, /sem histórico de 6 meses/)
  const min = dadoItem(ITENS.minerio, dados, seis)
  assert.equal(min.valorTexto, 'US$ 97,7')
  assert.equal(min.mes, 1.45)
  assert.ok(min.periodo.pct < 0 && min.emReais != null && min.emReais > min.periodo.pct, 'em reais cai menos porque o dólar subiu')
  assert.match(min.frase, /^Minério de ferro a US\$ 97,7\/t \(média de set\/2026\): −\d+,\d% em 6 meses, em dólar\. Em reais, −\d+,\d%: o dólar subiu \d+,\d% no período\.$/)
  const brent = dadoItem(ITENS.petroleo, dados, seis)
  assert.equal(brent.valorTexto, 'US$ 115,22')
  assert.ok(brent.periodo.pct > 0 && Number.isFinite(brent.dia))
  const frete = dadoItem(ITENS.frete, dados, seis)
  assert.equal(frete.valorTexto, '534,8')
  assert.match(frete.frase, /Não é cotação de rota brasileira/)
  assert.equal(dadoItem(ITENS.aco, dados, seis).semSerie, ITENS.aco.semSerie)
  assert.equal(dadoItem(ITENS.soja, dados, seis).indisponivel, 'Preço indisponível no momento.')
  assert.equal(dadoItem(ITENS.trigo, dados, seis).indisponivel, 'Coleta ainda não existe para este item.')
})

test('cenário, roteiro e resumo final', () => {
  const linhas = linhasCenario(dados)
  assert.deepEqual(linhas.map((l) => l.key), ['selic', 'cdi', 'ipca', 'usd', 'focus-Selic', 'focus-IPCA'])
  assert.equal(linhas[0].valor, '14,25%')
  assert.equal(linhas[3].nota, '+0,30% hoje')
  const r = montarRoteiro({ nome: 'Metalúrgica Exemplo', setorId: 'metalmecanica', itens: ['usd', 'minerio', 'aco', 'trigo'], periodo: seis }, dados)
  assert.deepEqual(r.map((s) => s.kind), ['capa', 'cenario', 'cadeia', 'item', 'item', 'item', 'agenda', 'perguntas', 'fim'])
  assert.equal(r[0].nome, 'Metalúrgica Exemplo')
  assert.equal(r[3].manchetes.length, 2)
  assert.equal(r[3].move.length, 4)
  assert.ok(r[4].move.length >= 3) // ficha do insumo (insumos.js)
  assert.ok(r[7].perguntas.length >= 3 && r[7].perguntas.length <= 8)
  assert.ok(r[8].pontos.length === 2 && r[8].pontos[0].startsWith('Minério de ferro:'), JSON.stringify(r[8].pontos))
  // capa do site vence o nome digitado; sem setor conhecido, erro
  const capa = normalizarCapa({ status: 'success', data: { title: 'Exemplo S.A. | Home', publisher: 'Exemplo S.A.', description: ' Peças ', logo: { url: 'https://e/l.png' } } }, 'exemplo.com.br')
  assert.deepEqual(capa, { titulo: 'Exemplo S.A.', descricao: 'Peças', logo: 'https://e/l.png', imagem: null, dominio: 'exemplo.com.br' })
  assert.equal(normalizarCapa({ status: 'fail' }, 'x'), null)
  assert.equal(montarRoteiro({ nome: 'X', capa, setorId: 'metalmecanica', itens: ['usd'], periodo: seis }, dados)[0].nome, 'Exemplo S.A.')
  assert.throws(() => montarRoteiro({ nome: 'X', setorId: 'nada', itens: [], periodo: seis }, dados), /Setor desconhecido/)
  assert.deepEqual(resumoFinal([], seis), [])
})
