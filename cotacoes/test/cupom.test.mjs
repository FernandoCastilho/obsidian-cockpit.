import test from 'node:test'
import assert from 'node:assert/strict'
import { cupomEfetivo, desvalorizacaoImplicita, formaDoMovimento, interp, leitura, matchUsDate, premioSobreUst, resumoTexto, serieDoVertice, ustEfetivo, variacaoPorVertice } from '../src/cupom.js'

const br = { compare: [{ date: '2026-10-26', label: 'Último dia' }, { date: '2026-10-23', label: '1 dia' }], curves: { '2026-10-26': [[63, 14.3], [126, 14.0], [252, 13.8], [504, 13.6]], '2026-10-23': [[63, 14.3], [126, 14.0], [252, 13.8], [504, 13.6]] } }
const cc = { compare: br.compare, curves: { '2026-10-26': [[63, 5.2], [126, 5.1], [252, 4.9], [504, 4.7]], '2026-10-23': [[63, 5.0], [126, 4.9], [252, 4.7], [504, 4.6]] } }
const us = { curves: { '2026-10-26': [[0.25, 4.08, '3 Mo'], [0.5, 4.07, '6 Mo'], [1, 4.04, '1 Yr'], [2, 3.96, '2 Yr']] } }

test('interpolação linear sem extrapolar', () => {
  assert.equal(interp([[0, 0], [10, 10]], 5), 5)
  assert.equal(interp([[0, 0], [10, 10]], 10), 10)
  assert.equal(interp([[1, 1], [10, 10]], 0.5), null)
  assert.equal(interp([[1, 1]], 1), null)
  assert.equal(interp(null, 1), null)
})

test('cupom linear 360 vira taxa efetiva comparável; desvalorização implícita bate com a conta direta', () => {
  const eff = cupomEfetivo(4.9, 252)
  assert.ok(Math.abs(eff - ((1 + 0.049 * (365 / 360)) - 1) * 100) < 1e-9)
  const dep = desvalorizacaoImplicita(13.8, 4.9, 252)
  assert.ok(Math.abs(dep - ((1.138 / (1 + eff / 100)) - 1) * 100) < 1e-9)
  assert.ok(dep > 8 && dep < 9)
  assert.equal(cupomEfetivo(NaN, 252), null)
  assert.ok(Math.abs(ustEfetivo(4.04) - ((1 + 0.0202) ** 2 - 1) * 100) < 1e-9)
})

test('prêmio sobre o Treasury do mesmo prazo e leitura por vértice', () => {
  const p = premioSobreUst(4.9, 252, us.curves['2026-10-26'])
  assert.ok(p.spread > 0.7 && p.spread < 1.2)
  assert.equal(premioSobreUst(4.9, 2520, us.curves['2026-10-26']), null) // fora da curva americana
  const rows = leitura({ br, cc, us }, '2026-10-26')
  assert.equal(rows.length, 4)
  assert.equal(rows.find((r) => r.du === 252).cupom, 4.9)
  assert.equal(leitura({ br, cc, us }, '2000-01-01').length, 0)
})

test('variação por vértice em bps, forma do movimento e série do vértice', () => {
  const ch = variacaoPorVertice(cc, '2026-10-23', '2026-10-26')
  assert.deepEqual(ch.map((c) => Math.round(c.bps)), [20, 20, 20, 10])
  const m = formaDoMovimento(ch)
  assert.ok(m.level > 15 && m.slope < 0)
  assert.match(m.kind, /achatamento/)
  assert.match(formaDoMovimento([{ du: 63, bps: 10 }, { du: 126, bps: 10 }, { du: 252, bps: 10 }, { du: 504, bps: 10 }]).kind, /paralelo/)
  assert.match(formaDoMovimento([{ du: 63, bps: 0 }, { du: 126, bps: 0 }, { du: 252, bps: 1 }]).kind, /estável/)
  assert.equal(formaDoMovimento([{ du: 63, bps: 1 }]), null)
  assert.deepEqual(serieDoVertice(cc, 252).map((p) => p.value), [4.7, 4.9])
})

test('resumo em frases factuais e data americana equivalente', () => {
  const t = resumoTexto({ br, cc, us })
  assert.match(t[0], /Cupom cambial de 1 ano em 4,90% a\.a\. \(26\/10\)/)
  assert.ok(t.some((l) => /desvalorização do real/.test(l)))
  assert.ok(t.some((l) => /p\.p\. acima do Treasury de 1 ano/.test(l)))
  assert.ok(!t.some((l) => /−0 bps|\+0 bps/.test(l)))
  assert.ok(t.some((l) => /Desde 23\/10: cupom de 1 ano \+20 bps/.test(l)))
  assert.deepEqual(resumoTexto({ br: null, cc: null, us: null }), [])
  assert.equal(matchUsDate(us, '2026-10-27'), '2026-10-26')
})
