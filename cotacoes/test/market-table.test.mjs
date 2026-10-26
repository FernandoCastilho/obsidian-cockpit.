import test from 'node:test'
import assert from 'node:assert/strict'
import { toQuote } from '../src/useQuotes.js'
const raw = { bid:'5.1', ask:'5.2', high:'5.3', low:'5', timestamp:'1760000000', pctChange:'0.5' }
test('market table absolute day change is source-provided, never inferred or zero for missing', () => {
  for (const value of [undefined, null, '', ' ', 'NaN', 'Infinity', false, true, [], {}]) assert.equal(toQuote({ ...raw, varBid:value }, 'USD').delta, null)
  for (const [value, expected] of [['0',0],['-0.0123',-.0123],['0.025',.025]]) assert.equal(toQuote({ ...raw, varBid:value }, 'USD').delta, expected)
  const quote = toQuote(raw,'USD')
  assert.equal(quote.bid,5.1); assert.equal(quote.pct,.5); assert.equal(quote.timestamp,1760000000000)
})
