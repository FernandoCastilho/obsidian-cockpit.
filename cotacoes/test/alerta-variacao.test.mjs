import test from 'node:test'
import assert from 'node:assert/strict'
import { alertasDoDia, textoAlerta } from '../src/alertaVariacao.js'

test('alerta de variação: acima de 0,30% da primeira cotação do dia, por moeda e sentido', () => {
  const now = Date.parse('2026-11-03T15:00:00Z'), t0 = Date.parse('2026-11-03T12:05:00Z')
  const firsts = { USD: { t: t0, v: 5.4800 }, EUR: { t: t0, v: 6.1400 } }
  const q = (bid, extra = {}) => ({ bid, timestamp: now - 60000, ...extra })
  let a = alertasDoDia({ quotes: { USD: q(5.5000), EUR: q(6.1500) }, firsts, now }) // USD +0,36%; EUR +0,16%
  assert.deepEqual(a.map((x) => [x.code, x.dir]), [['USD', 'alta']])
  assert.equal(a[0].id, '2026-11-03:USD:alta')
  assert.match(textoAlerta(a[0]), /Dólar em alta de 0,36% desde a primeira cotação do dia \(5,4800 às 09:05 → 5,5000 às 11:59\)/)
  a = alertasDoDia({ quotes: { USD: q(5.4600), EUR: q(6.1000) }, firsts, now })
  assert.deepEqual(a.map((x) => [x.code, x.dir]), [['USD', 'queda'], ['EUR', 'queda']])
  assert.equal(alertasDoDia({ quotes: { USD: q(5.4964) }, firsts, now }).length, 0) // +0,299%: dentro do limite
  assert.equal(alertasDoDia({ quotes: { USD: q(5.6, { stale: true }) }, firsts, now }).length, 0) // cotação retida
  assert.equal(alertasDoDia({ quotes: { USD: q(5.6, { fallback: true }) }, firsts, now }).length, 0) // reserva do BCE
  assert.equal(alertasDoDia({ quotes: { USD: q(5.6) }, firsts: { USD: { t: t0 - 864e5, v: 5.48 } }, now }).length, 0) // base de ontem
})
