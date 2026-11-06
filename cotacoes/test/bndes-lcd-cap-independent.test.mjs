import test from 'node:test'
import assert from 'node:assert/strict'
import { lcdQuoteAt, parseLcdSchedule, simulateLcdCap } from '../src/bndesLcdCap.js'
const fixture = () => ({ mode: 'projection', principalCents: 100000000, contractDate: '2026-10-05', releaseDate: '2026-10-15', ld1: { annualPct: '0.5', fixingDate: '2026-10-01', source: 'Synthetic audit case, not official quotation', confirmed: true }, spreads: { bndes: '1.25', intermediation: '0.25', agent: '3' }, selicScenario: { annualPct: '10', acknowledged: true }, schedule: { source: 'Synthetic contractual calendar', confirmed: true, events: [{ date: '2027-10-15', businessDays: 252, amortize: true }, { date: '2028-10-16', businessDays: 252, amortize: true }] } })
const zeroFixed = d => { d.ld1.annualPct = '0'; d.spreads = { bndes: '0', intermediation: '0', agent: '0' } }
// Independent exact decimal oracle for integer annual exponents; no floating factor.
function exactAnnual(principal, rate, correction = true) {
  const [whole, fractional = ''] = rate.split('.')
  const denominator = 100n * 10n ** BigInt(fractional.length)
  const numerator = BigInt(whole + fractional)
  const n = BigInt(principal) * (correction ? denominator + numerator : numerator)
  return Number((2n * n + denominator) / (2n * denominator))
}

test('audit: annual exact ledger and amortization use updated principal, not fixed initial SAC', () => {
  const d = fixture(), r = simulateLcdCap(d)
  assert.equal(r.ok, true)
  let balance = d.principalCents, expectedPayments = 0
  for (let i = 0; i < r.rows.length; i++) {
    const corrected = exactAnnual(balance, '10')
    const interest = exactAnnual(corrected, '5', false)
    const amortization = Math.round(corrected / (r.rows.length - i))
    assert.equal(r.rows[i].correctedCents, corrected)
    assert.equal(r.rows[i].interestCents, interest)
    assert.equal(r.rows[i].amortizationCents, amortization)
    expectedPayments += interest + amortization
    balance = corrected - amortization
  }
  assert.equal(balance, 0); assert.equal(r.totals.paymentCents, expectedPayments)
})

test('audit regression: high-principal decimal Selic cannot silently round a cent up', () => {
  const d = fixture(); zeroFixed(d); d.principalCents = 884509417120; d.selicScenario.annualPct = '0.110566441190'; d.schedule.events.length = 1
  const r = simulateLcdCap(d), expected = exactAnnual(d.principalCents, d.selicScenario.annualPct)
  assert.equal(expected, 885487387704)
  assert.ok(!r.ok || r.rows[0].correctedCents === expected, 'Must calculate exact result or block numerical ambiguity, never return wrong cent')
  if (!r.ok) { assert.equal(r.error.code, 'ROUNDING_UNCERTAIN'); assert.deepEqual(r.rows, []) }
})

test('audit regression: high-principal decimal fixed charge cannot silently round a cent up', () => {
  const d = fixture(); zeroFixed(d); d.principalCents = 884509417120; d.selicScenario.annualPct = '0'; d.ld1.annualPct = '0.110566441190'; d.schedule.events.length = 1
  const r = simulateLcdCap(d), expected = exactAnnual(d.principalCents, d.ld1.annualPct, false)
  assert.equal(expected, 977970584)
  assert.ok(!r.ok || r.rows[0].interestCents === expected, 'Must calculate exact result or block numerical ambiguity, never return wrong cent')
  if (!r.ok) { assert.equal(r.error.code, 'ROUNDING_UNCERTAIN'); assert.deepEqual(r.rows, []) }
})

test('audit regression: weekend maturity cannot be represented as already adjusted business date', () => {
  for (const date of ['2026-10-17', '2026-10-18']) {
    const d = fixture(); d.schedule.events = [{ date, businessDays: 1, amortize: true }]
    const r = simulateLcdCap(d); assert.equal(r.ok, false, date); assert.deepEqual(r.rows, [])
  }
})

test('audit regression: DU count cannot exceed weekdays even without a holiday calendar', () => {
  const d = fixture(); d.schedule.events = [{ date: '2026-10-19', businessDays: 4, amortize: true }]
  assert.equal(simulateLcdCap(d).ok, false, 'Thursday to Monday spans at most2 working days, not4')
})

test('audit: valid supplied count remains accepted without fabricating a holiday calendar', () => {
  const d = fixture(); d.schedule.events = [{ date: '2026-10-19', businessDays: 2, amortize: true }]
  assert.equal(simulateLcdCap(d).ok, true)
})

test('audit regression: LD1 selected quotation dates must be real ISO calendar dates', () => {
  for (const invalid of ['2026-10-00', '2026-10-01garbage', '2026-11-31']) {
    const data = { series: { LD1: { source: 'Synthetic audit source', sourceValidated: true, points: [[invalid, 1]] } } }
    assert.equal(lcdQuoteAt(data, '2026-12-15', '2026-12-15'), null, invalid)
  }
})

test('audit: retained LD1 provenance and zero-valued quotation survive selection', () => {
  const data = { series: { LD1: { source: 'Synthetic audit source', sourceValidated: true, points: [['2026-10-01', 0]] } }, stale: { LD1: 123 } }
  const result = lcdQuoteAt(data, '2026-10-15', '2026-11-05')
  assert.equal(result.annualPct, '0'); assert.equal(result.retainedSince, 123)
  assert.equal(result.source, 'Synthetic audit source')
})

test('audit: malformed final event returns no partially usable cashflow', () => {
  const d = fixture(); d.schedule.events[1].businessDays = null
  const r = simulateLcdCap(d); assert.equal(r.ok, false); assert.deepEqual(r.rows, []); assert.equal(r.totals, null)
})

test('audit: scenario result does not mutate fixed quote, events or rates', () => {
  const d = fixture(), saved = JSON.stringify(d)
  simulateLcdCap(d); assert.equal(JSON.stringify(d), saved)
})

test('audit: latest effective LD1 can cross quarter, never use observation after contract', () => {
  const data = { series: { LD1: { source: 'Synthetic audit source', sourceValidated: true, points: [['2026-09-30', 1], ['2026-10-15', 2]] } } }
  assert.equal(lcdQuoteAt(data, '2026-10-01', '2026-11-05').annualPct, '1')
  assert.equal(lcdQuoteAt(data, '2026-10-15', '2026-10-01'), null)
})

test('audit: schedule parser rejects extra fields rather than silently applying fees or other products', () => {
  const r = parseLcdSchedule('2026-11-16;21;A;IOF=0')
  assert.equal(r.ok, false); assert.deepEqual(r.events, [])
})


test('audit: negative LD1 reduces only fixed remuneration, with exact annual cents', () => {
  const d = fixture(); d.ld1.annualPct = '-0.110000'
  const r = simulateLcdCap(d); assert.equal(r.ok, true)
  assert.equal(r.fixedAnnualPct, 4.39)
  assert.equal(r.rows[0].interestCents, exactAnnual(110000000, '4.39', false))
  assert.equal(r.rows[0].interestCents, 4829000)
  assert.equal(r.rows[0].capitalizedSelicCents, 10000000)
  assert.equal(r.rows[0].amortizationCents, 55000000)
})

test('audit: signed decimal LD1 and opposing spread cancel exactly without negative zero charges', () => {
  const d = fixture(); d.ld1.annualPct = '-0.110000000001'; d.spreads = { bndes: '0', intermediation: '0', agent: '0.110000000001' }
  const r = simulateLcdCap(d); assert.equal(r.ok, true)
  assert.equal(r.fixedAnnualPct, 0); assert.equal(r.totals.interestCents, 0)
  assert.equal(r.totals.paymentCents, r.totals.principalCents + r.totals.capitalizedSelicCents)
})

test('audit: negative net charge remains explicitly unsupported rather than silently floored', () => {
  const d = fixture(); d.ld1.annualPct = '-0.110000000001'; d.spreads = { bndes: '0', intermediation: '0', agent: '0.110000000000' }
  const r = simulateLcdCap(d); assert.equal(r.ok, false); assert.equal(r.error.code, 'RATE_LIMIT'); assert.deepEqual(r.rows, [])
})

test('audit: manual valid fixing before current quarter is accepted, future fixing rejected', () => {
  const d = fixture(); d.ld1.fixingDate = '2026-09-01'; d.ld1.annualPct = '-0.11'
  assert.equal(simulateLcdCap(d).ok, true)
  d.ld1.fixingDate = '2026-10-06'; const r = simulateLcdCap(d)
  assert.equal(r.ok, false); assert.equal(r.error.code, 'LCD_FIXING_DATE')
})

test('audit: negative quote preserved across quarter while later quotation remains excluded', () => {
  const data = { series: { LD1: { source: 'Synthetic audit source', sourceValidated: true, points: [['2026-10-15', 1], ['2026-09-01', -0.11], ['2026-02-01', 0.5]] } } }
  const result = lcdQuoteAt(data, '2026-10-05', '2026-11-05')
  assert.equal(result.date, '2026-09-01'); assert.equal(result.annualPct, '-0.11')
  assert.equal(lcdQuoteAt(data, '2026-01-31', '2026-11-05'), null)
})
