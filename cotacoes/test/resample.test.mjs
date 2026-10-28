import test from 'node:test'
import assert from 'node:assert/strict'
import { nativeStep, resample, scaleOptions } from '../src/resample.js'
const T = (s) => Date.parse(s)
const five = []
for (let t = T('2026-10-27T13:00:00Z'); t < T('2026-10-27T17:00:00Z'); t += 5 * 60e3) five.push({ t, bid: 5 + (t - T('2026-10-27T13:00:00Z')) / 1e9, high: 0, low: 0 })
const daily = []
for (let t = T('2026-01-01T15:00:00Z'); t < T('2026-10-01T15:00:00Z'); t += 864e5) daily.push({ t, bid: 100 + (t - T('2026-01-01T15:00:00Z')) / 864e5 })

test('detecta o espaçamento típico do dado', () => {
  assert.equal(nativeStep(five), 5 * 60e3)
  assert.equal(nativeStep(daily), 864e5)
  assert.equal(nativeStep([{ t: 1, bid: 1 }]), Infinity)
})

test('hora: um ponto por hora, último valor e máx/mín do período', () => {
  const h = resample(five.map((p, i) => ({ ...p, high: p.bid + 1, low: p.bid - 1, i })), 'hora')
  assert.equal(h.length, 4)
  assert.equal(h[0].bid, five[11].bid)
  assert.equal(h[0].high, five[11].bid + 1)
  assert.equal(h[0].low, five[0].bid - 1)
})

test('mês e ano agrupam o dado diário; o valor é o último dia do período', () => {
  const m = resample(daily, 'mes'), y = resample(daily, 'ano')
  assert.equal(m.length, 9)
  assert.equal(y.length, 1)
  assert.equal(m[0].bid, 100 + 30) // 31/01
  assert.ok(m.every((p) => p.high >= p.bid && p.low <= p.bid))
})

test('só oferece escala mais grossa que o dado: sem hora em série diária', () => {
  const d = Object.fromEntries(scaleOptions(daily).map((o) => [o.id, o]))
  assert.equal(d.hora.enabled, false)
  assert.match(d.hora.reason, /detalhe de hora/)
  assert.equal(d.dia.enabled, true); assert.equal(d.mes.enabled, true); assert.equal(d.ano.enabled, false) // ano: 1 ponto só
  const f = Object.fromEntries(scaleOptions(five).map((o) => [o.id, o]))
  assert.equal(f.hora.enabled, true)
  assert.equal(f.dia.enabled, false) // um único dia
  assert.equal(scaleOptions([{ t: 1, bid: 1 }]).every((o) => !o.enabled), true)
})
