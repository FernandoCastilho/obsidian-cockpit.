import test from 'node:test'
import assert from 'node:assert/strict'
import { filterEvents, groupByDay, mergeEvents, periodRange } from '../src/calendar.js'

// Quarta, 28/10/2026, 12:00 em Brasília
const NOW = Date.parse('2026-10-28T15:00:00Z')
const ev = (iso, title, impact = 'high', country = 'US', src = 'ff') => ({ src, country, t: Date.parse(iso), title, impact, forecast: null, previous: null })

test('períodos em dias civis de Brasília', () => {
  const [a, b] = periodRange('hoje', NOW)
  assert.equal(new Date(a).toISOString(), '2026-10-28T03:00:00.000Z')
  assert.equal(new Date(b).toISOString(), '2026-10-29T03:00:00.000Z')
  const [s, e] = periodRange('semana', NOW) // segunda 26 a domingo 1/11 (exclusivo)
  assert.equal(new Date(s).toISOString(), '2026-10-26T03:00:00.000Z')
  assert.equal(new Date(e).toISOString(), '2026-11-02T03:00:00.000Z')
  assert.equal(new Date(periodRange('amanha', NOW)[0]).toISOString(), '2026-10-29T03:00:00.000Z')
  assert.equal(new Date(periodRange('30d', NOW)[1]).toISOString(), '2026-11-27T03:00:00.000Z')
  // domingo ainda pertence à semana que termina nele
  assert.equal(new Date(periodRange('semana', Date.parse('2026-11-01T15:00:00Z'))[0]).toISOString(), '2026-10-26T03:00:00.000Z')
})

test('filtros de período, impacto e país; agrupamento por dia', () => {
  const events = [
    ev('2026-10-28T12:30:00Z', 'CPI', 'high'), ev('2026-10-28T13:30:00Z', 'Outro', 'low'), ev('2026-10-28T02:00:00Z', 'Madrugada anterior', 'high'),
    ev('2026-10-29T12:30:00Z', 'PIB', 'high', 'EU'), ev('2026-10-29T15:00:00Z', 'Médio', 'medium', 'US'),
  ]
  assert.deepEqual(filterEvents(events, { period: 'hoje', now: NOW }).map((e) => e.title), ['CPI'])
  assert.deepEqual(filterEvents(events, { period: 'semana', impacts: ['high'], now: NOW }).map((e) => e.title), ['CPI', 'Madrugada anterior', 'PIB']) // 23h de terça em Brasília ainda é a semana
  assert.deepEqual(filterEvents(events, { period: '7d', impacts: ['high', 'medium', 'low'], country: 'US', now: NOW }).map((e) => e.title), ['CPI', 'Outro', 'Médio'])
  const g = groupByDay(filterEvents(events, { period: '7d', impacts: ['high', 'medium', 'low'], now: NOW }))
  assert.deepEqual(g.map((d) => [d.key, d.events.length]), [['2026-10-28', 2], ['2026-10-29', 2]]) // a madrugada UTC de 28 é 27 em Brasília e fica fora de 7d
})

test('mescla com a agenda do Brasil e deduplica; FOMC/payroll da agenda só quando os EUA não estão cobertos', () => {
  const file = { sources: { bls: { ok: true }, fomc: { ok: true } }, events: [{ ...ev('2026-10-28T18:00:00Z', 'FOMC: decisão de juros do Fed', 'high', 'US', 'fomc') }, ev('2026-10-28T18:00:00Z', 'FOMC Statement', 'high', 'US', 'ff'), ev('2026-10-28T18:00:00Z', 'FOMC Statement', 'high', 'US', 'ff')] }
  const merged = mergeEvents(file, NOW, 10)
  assert.equal(merged.filter((e) => /FOMC/.test(e.title)).length, 1, 'FOMC oficial substitui o do feed e a agenda não duplica')
  assert.ok(merged.some((e) => e.country === 'BR' && /Copom/.test(e.title)), 'Copom da agenda curada')
  const sem = mergeEvents({ sources: { bls: { ok: false }, fomc: { ok: false } }, events: [] }, NOW, 10)
  assert.ok(sem.some((e) => /FOMC/.test(e.title) && e.country === 'US' && e.src === 'agenda'), 'sem cobertura, a agenda cobre o FOMC')
  assert.ok(mergeEvents(null, NOW, 10).length > 0)
})
