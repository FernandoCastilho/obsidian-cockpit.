import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCalendar, parseBea, parseBls, parseFf, parseFomc, withinWindow } from '../scripts/calendar-lib.mjs'

const NOW = Date.parse('2026-10-28T15:00:00Z')

test('Forex Factory: moeda vira país, impacto e horário em UTC; itens inválidos são ignorados', () => {
  const ev = parseFf([
    { title: 'CPI m/m', country: 'AUD', date: '2026-10-27T20:30:00-04:00', impact: 'High', forecast: '0.7%', previous: '0.4%' },
    { title: 'Bank Holiday', country: 'NZD', date: '2026-10-25T15:00:00-04:00', impact: 'Holiday', forecast: '', previous: '' },
    { title: 'x', country: 'BRL', date: '2026-10-25T15:00:00-04:00', impact: 'High' },
    { title: 'y', country: 'USD', date: 'não é data', impact: 'High' },
    { title: 'z', country: 'USD', date: '2026-10-28T10:00:00-04:00', impact: 'Extreme' },
  ])
  assert.equal(ev.length, 2)
  assert.equal(ev[0].country, 'NZ'); assert.equal(ev[0].impact, 'holiday'); assert.equal(ev[0].forecast, null)
  assert.equal(ev[1].t, Date.parse('2026-10-28T00:30:00Z')); assert.equal(ev[1].forecast, '0.7%'); assert.equal(ev[1].src, 'ff')
  assert.throws(() => parseFf({}), /formato inesperado/)
  assert.throws(() => parseFf([{ title: 'x', country: 'BRL' }]), /sem eventos válidos/)
})

const BLS = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;TZID=US-Eastern:20261014T083000
SUMMARY:Consumer Price Index
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=US-Eastern:20261204T083000
SUMMARY:Employment Situation
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=US-Eastern:20261020T100000
SUMMARY:State Employment and Unemployment (Monthly)
END:VEVENT
END:VCALENDAR`
test('BLS: só divulgações que movem mercado; horário de Nova York (EDT/EST) vira UTC', () => {
  const ev = parseBls(BLS)
  assert.equal(ev.length, 2)
  assert.equal(ev[0].t, Date.parse('2026-10-14T12:30:00Z')) // EDT, UTC−4
  assert.equal(ev[1].t, Date.parse('2026-12-04T13:30:00Z')) // EST, UTC−5
  assert.equal(ev[0].impact, 'high'); assert.match(ev[0].title, /CPI/)
  assert.throws(() => parseBls('BEGIN:VCALENDAR\nEND:VCALENDAR'), /sem divulgações/)
})

const BEA = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:GDP (Advance Estimate)\\, 3rd Quarter 2026
DTSTART:20261029T123000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:Personal Income and Outlays\\, September 2026
DTSTART:20261029T123000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:Outdoor Recreation Economic Statistics\\, U.S. and States\\, 2025
DTSTART:20261118T150000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:Experimental Research and Development Economic Statistics\\, U.S. a
  nd States\\, 2024
DTSTART:20261022T140000Z
END:VEVENT
END:VCALENDAR`
test('BEA: PIB, PCE e balança; ignora o resto e dobras de linha', () => {
  const ev = parseBea(BEA)
  assert.deepEqual(ev.map((e) => e.title), ['PIB do trimestre, 1ª estimativa (EUA)', 'PCE: renda e consumo pessoal (EUA)'])
  assert.equal(ev[0].t, Date.parse('2026-10-29T12:30:00Z'))
})

const FED = `<h4><a>2026 FOMC Meetings</a></h4>
<div class="row fomc-meeting"><div class="fomc-meeting__month col"><strong>January</strong></div><div class="fomc-meeting__date col">27-28</div></div>
<div class="fomc-meeting--shaded row fomc-meeting"><div class="fomc-meeting--shaded fomc-meeting__month col"><strong>April/May</strong></div><div class="fomc-meeting--shaded fomc-meeting__date col">28-29*</div></div>
<div class="fomc-meeting__month col"><strong>October</strong></div><div class="fomc-meeting__date col">27-28</div>
<h4><a>2027 FOMC Meetings</a></h4>
<div class="fomc-meeting__month col"><strong>January</strong></div><div class="fomc-meeting__date col">26-27</div>`
test('FOMC: decisão no último dia, 14h de Nova York; meses compostos e anos seguintes', () => {
  const ev = parseFomc(FED)
  assert.equal(ev.length, 4)
  assert.equal(ev[0].t, Date.parse('2026-01-28T19:00:00Z')) // EST
  assert.equal(ev[1].t, Date.parse('2026-05-29T18:00:00Z')) // abril/maio -> 29 de maio, EDT
  assert.equal(ev[2].t, Date.parse('2026-10-28T18:00:00Z'))
  assert.equal(ev[3].t, Date.parse('2027-01-27T19:00:00Z'))
  assert.throws(() => parseFomc('<html></html>'), /sem reuniões/)
})

test('janela e montagem: fonte que falha reaproveita os eventos anteriores e marca stale', () => {
  const ff = [{ src: 'ff', country: 'US', t: NOW + 3600e3, title: 'a', impact: 'high' }, { src: 'ff', country: 'US', t: NOW + 90 * 864e5, title: 'longe', impact: 'high' }]
  assert.equal(withinWindow(ff, NOW).length, 1)
  const previous = { generatedAt: NOW - 3600e3, sources: { bls: { checkedAt: NOW - 7200e3 } }, events: [{ src: 'bls', country: 'US', t: NOW + 7200e3, title: 'CPI antigo', impact: 'high' }] }
  const file = buildCalendar({ ff: { events: ff }, bls: { error: 'HTTP 403' }, bea: { events: [] }, fomc: { error: 'x' } }, previous, NOW)
  assert.equal(file.sources.ff.ok, true); assert.equal(file.sources.bls.ok, false)
  assert.ok(file.events.some((e) => e.title === 'CPI antigo'), 'reaproveita o anterior')
  assert.equal(file.stale.bls, NOW - 7200e3)
  assert.equal(file.events.filter((e) => e.title === 'longe').length, 0)
  assert.deepEqual(file.events.map((e) => e.t), [...file.events.map((e) => e.t)].sort((a, b) => a - b))
})
