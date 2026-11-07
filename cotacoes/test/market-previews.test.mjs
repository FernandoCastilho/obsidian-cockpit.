import test from 'node:test'
import assert from 'node:assert/strict'
import { marketPreviews } from '../src/marketPreviews.js'
const p = (date, minute, bid = 5) => ({ t: Date.parse(`${date}T12:${String(minute).padStart(2, '0')}:00Z`), bid })
test('one sample today falls back to a real prior session', () => {
 const usd = [p('2026-11-05', 0), p('2026-11-05', 10, 5.1), p('2026-11-06', 0)]
 const eur = [p('2026-11-05', 0, 6), p('2026-11-05', 10, 6.2), p('2026-11-06', 0, 6), p('2026-11-06', 10, 6.1)]
 const result = marketPreviews(usd, eur, '2026-11-06')
 assert.equal(result.USD.day, '2026-11-05');assert.equal(result.EUR.day, '2026-11-06');assert.equal(result.PAR.day, '2026-11-05')
 assert.equal(result.PAR.points.length,2);assert.equal(result.PAR.points[1].bid,6.2/5.1)
 assert.deepEqual(result.USD.points,usd.slice(0,2))
})
test('never creates prices, combines different dates, or stale legs', () => {
 assert.deepEqual(marketPreviews([], [], '2026-11-06'), {USD:null,EUR:null,PAR:null})
 assert.equal(marketPreviews([p('2026-11-06',40),p('2026-11-06',50)],[p('2026-11-06',0,6)],'2026-11-06').PAR,null)
 assert.equal(marketPreviews([p('2026-11-06',0),p('2026-11-06',10)],[p('2026-11-05',0,6),p('2026-11-05',10,6.1)],'2026-11-06').PAR,null)
})
test('filters invalid/future values and respects São Paulo session', () => {
 const midnight = {t:Date.parse('2026-11-06T01:00:00Z'),bid:5}
 const result = marketPreviews([p('2026-11-05',0),midnight,{t:NaN,bid:5},p('2026-11-07',0)], [], '2026-11-06')
 assert.equal(result.USD.day,'2026-11-05');assert.equal(result.USD.points.length,2)
})
