import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteAgeState, QUOTE_AGE_LIMIT_MS } from '../src/quoteFreshness.js'
const now = Date.parse('2026-10-26T20:48:00Z')
test('HTTP success or new collection never resets the original price age', () => {
  const q = {timestamp:now-2*3600000,generatedAt:now}
  assert.equal(quoteAgeState(q,now),'Dado antigo')
  assert.equal(q.timestamp,now-2*3600000)
  assert.equal(quoteAgeState({timestamp:now-QUOTE_AGE_LIMIT_MS},now),'')
  assert.equal(quoteAgeState({timestamp:now-QUOTE_AGE_LIMIT_MS-1},now),'Dado antigo')
})
test('stale, daily reserve, absence and clock problems have distinct states', () => {
  assert.equal(quoteAgeState(null,now),'Sem dado')
  assert.equal(quoteAgeState({stale:true,timestamp:now},now),'Pendente')
  assert.equal(quoteAgeState({fallback:true,timestamp:now-86400000},now),'Reserva diária')
  for(const timestamp of [null,NaN,0,now+60001]) assert.equal(quoteAgeState({timestamp},now),'Horário inválido')
})
test('age is factual even on weekend/outside collector window; never declares market closed', () => {
  const sunday=Date.parse('2026-10-25T15:00Z'),q={timestamp:sunday-86400000}
  assert.equal(quoteAgeState(q,sunday),'Dado antigo')
  assert.equal(quoteAgeState({timestamp:now},now),'')
})
