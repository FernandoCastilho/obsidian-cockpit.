// Calculadoras › BNDES Finame Materiais: regras do produto, composição da taxa, carência com juros e cronograma SAC/Price.
import test from 'node:test'
import assert from 'node:assert/strict'
import { REGRAS, conferir, cronograma, faixaTfb, simular, spreadSobreCdi, taxaFinal, tlpNominal } from '../src/finameMateriais.js'
import { parseCommand } from '../src/terminal.js'

test('regras: prazo, carência (menor com TFB), participação e tetos; faixa da TFB pelo prazo', () => {
  assert.equal(REGRAS.prazoMaxMeses, 84); assert.equal(REGRAS.carenciaMaxMeses, 24); assert.equal(REGRAS.carenciaMaxTfbMeses, 12)
  assert.deepEqual(conferir({ valor: 1e6, participacao: 100, prazo: 84, carencia: 24, custo: 'tlp' }).erros, [])
  assert.match(conferir({ valor: 1e6, participacao: 100, prazo: 85, carencia: 0, custo: 'tlp' }).erros[0], /acima do máximo do produto: 84/)
  assert.match(conferir({ valor: 1e6, participacao: 100, prazo: 60, carencia: 13, custo: 'tfb' }).erros[0], /12 meses com TFB/)
  assert.deepEqual(conferir({ valor: 1e6, participacao: 100, prazo: 60, carencia: 24, custo: 'tlp' }).erros, [])
  assert.match(conferir({ valor: 1e6, participacao: 100, prazo: 12, carencia: 12, custo: 'tlp' }).erros[0], /menor que o prazo/)
  assert.match(conferir({ valor: 1e6, participacao: 120, prazo: 12, carencia: 0, custo: 'tlp' }).erros[0], /1% a 100%/)
  const c = conferir({ valor: 30e6, participacao: 100, prazo: 60, carencia: 6, custo: 'tfb' })
  assert.deepEqual(c.erros, []); assert.equal(c.avisos.length, 1); assert.match(c.avisos[0], /R\$ 20 milhões/)
  assert.equal(conferir({ valor: 30e6, participacao: 50, prazo: 60, carencia: 6, custo: 'tfb' }).avisos.length, 0)
  assert.deepEqual([24, 36, 37, 60, 61, 84, 100].map(faixaTfb), [36, 36, 60, 60, 84, 84, 120])
  assert.deepEqual(parseCommand('finame'), { kind: 'tab', id: 'calculadora', sub: 'finame-materiais' })
})

test('taxa final composta e TLP nominal', () => {
  assert.ok(Math.abs(taxaFinal(16, 1.25, 3) - 20.9735) < 1e-3) // 1,16 × 1,0125 × 1,03 − 1
  assert.equal(taxaFinal(0, 0, 0), 0)
  assert.ok(Math.abs(tlpNominal(7.72, 4.52) - 12.5889) < 1e-3)
  assert.ok(Math.abs(spreadSobreCdi(21, 14.15) - 6.0008) < 1e-3)
  assert.equal(spreadSobreCdi(21, null), null)
})

test('cronograma: juros na carência na periodicidade escolhida, SAC decrescente e Price constante; saldo zera', () => {
  const sac = cronograma({ financiado: 120_000, prazo: 24, carencia: 6, taxaAnual: 12.6825, sistema: 'sac', periodicidade: 3 })
  assert.equal(sac.length, 24)
  // 1% a.m.; na carência trimestral, só os meses 3 e 6 pagam juros (capitalizados dentro do trimestre)
  assert.deepEqual(sac.slice(0, 6).map((p) => +p.parcela.toFixed(2)), [0, 0, 3636.12, 0, 0, 3636.12])
  assert.ok(sac.slice(0, 6).every((p) => p.carencia && p.amortizacao === 0 && Math.abs(p.saldo - 120_000) < 1e-9))
  const am = sac.slice(6)
  assert.ok(am.every((p) => Math.abs(p.amortizacao - 120_000 / 18) < 1e-6))
  assert.ok(Math.abs(am[0].parcela - (120_000 / 18 + 1200)) < 0.01) // 12,6825% a.a. ≈ 1% a.m.
  assert.ok(am[0].parcela > am.at(-1).parcela && Math.abs(am.at(-1).saldo) < 1e-6)
  const price = cronograma({ financiado: 120_000, prazo: 24, carencia: 0, taxaAnual: 12.6825, sistema: 'price', periodicidade: 1 })
  assert.ok(price.every((p) => Math.abs(p.parcela - price[0].parcela) < 1e-6) && Math.abs(price.at(-1).saldo) < 1e-6)
  assert.ok(Math.abs(price[0].parcela - 5648.84) < 0.5)
  // carência mensal: juros todo mês, sem capitalização
  const mensal = cronograma({ financiado: 100_000, prazo: 12, carencia: 2, taxaAnual: 12.6825, sistema: 'sac', periodicidade: 1 })
  assert.deepEqual(mensal.slice(0, 2).map((p) => +p.juros.toFixed(2)), [1000, 1000])
})

test('simulação completa: totais, parcelas e IOF; entrada inválida devolve os erros das regras', () => {
  const r = simular({ valor: 500_000, participacao: 80, prazo: 60, carencia: 12, custo: 'tfb', custoFinanceiro: 16.5216, taxaBndes: 1.25, taxaAgente: 3, sistema: 'sac', periodicidade: 3, iofPct: 0 })
  assert.ok(r.ok); assert.equal(r.financiado, 400_000); assert.equal(r.recursosProprios, 100_000)
  assert.ok(Math.abs(r.taxa - taxaFinal(16.5216, 1.25, 3)) < 1e-9)
  assert.equal(r.parcelasAmortizacao, 48); assert.equal(r.parcelas.length, 60)
  assert.ok(r.jurosCarencia > 0 && r.juros > r.jurosCarencia && Math.abs(r.total - (400_000 + r.juros)) < 1e-6)
  assert.ok(r.primeiraParcela > r.ultimaParcela && r.iof === 0 && r.avisos.length === 0)
  const comIof = simular({ valor: 500_000, participacao: 100, prazo: 24, carencia: 0, custo: 'tlp', custoFinanceiro: 12.5, taxaBndes: 0.95, taxaAgente: 2.5, sistema: 'price', periodicidade: 1, iofPct: 0.38 })
  assert.ok(Math.abs(comIof.iof - 1900) < 1e-6 && Math.abs(comIof.total - (500_000 + comIof.juros + 1900)) < 1e-6)
  const ruim = simular({ valor: 500_000, participacao: 100, prazo: 90, carencia: 30, custo: 'tlp', custoFinanceiro: 12, taxaBndes: 1.25, taxaAgente: 3 })
  assert.equal(ruim.ok, false); assert.equal(ruim.erros.length, 2)
  assert.equal(simular({ valor: 500_000, participacao: 100, prazo: 12, carencia: 0, custo: 'tfb', custoFinanceiro: null, taxaBndes: 1.25, taxaAgente: 3 }).ok, false)
})
