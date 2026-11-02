import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collect } from '../scripts/quotes-lib.mjs'

const START = Date.UTC(2026, 10, 2, 12)
const STEP = 5 * 60 * 1000

// Plausible prices for each pair keep these tests focused on rejected updates.
const BASE = {
  USDBRL: { bid: '5.4', ask: '5.401', high: '5.5', low: '5.3' },
  EURBRL: { bid: '6.1', ask: '6.101', high: '6.2', low: '6.0' },
  JPYBRL: { bid: '0.035', ask: '0.0351', high: '0.036', low: '0.034' },
  USDCNH: { bid: '6.65', ask: '6.651', high: '6.7', low: '6.6' },
}

function batch(at, changes = {}) {
  return Object.fromEntries(Object.entries(BASE).map(([pair, prices]) => [pair, {
    ...prices,
    pctChange: '0',
    timestamp: String(at / 1000),
    ...changes[pair],
  }]))
}

const absurdUsd = { bid: '54', ask: '54.01', high: '55', low: '53' }
const freshUsd = { bid: '5.41', ask: '5.411' }
const freshEuro = { bid: '6.12', ask: '6.121' }

async function directory(t) {
  const dir = await mkdtemp(join(tmpdir(), 'quote-safety-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return dir
}

async function collectBatch(dir, at, quotes) {
  return collect({
    dir,
    now: at,
    tries: 1,
    fetchFn: async () => ({
      ok: true,
      status: 200,
      json: async () => structuredClone(quotes),
    }),
  })
}

async function files(dir) {
  const [snapshot, intraday] = await Promise.all(['quotes.json', 'intraday.json'].map(async (name) =>
    JSON.parse(await readFile(join(dir, name), 'utf8'))))
  return { snapshot, intraday }
}

function assertWarning(quote) {
  assert.equal(quote.stale, true)
  assert.equal(typeof quote.error, 'string')
  assert.ok(quote.error.trim().length > 0)
}

function assertFresh(quote) {
  assert.notEqual(quote.stale, true)
  assert.ok(!quote.error)
}

function assertCnh(quote, at) {
  assert.ok(quote, 'a valid pair of source quotes must publish normalized CNH')
  assert.equal(quote.source, 'CNH')
  assert.equal(quote.cross, true)
  for (const field of ['bid', 'ask', 'high', 'low', 'pct']) {
    assert.equal(typeof quote[field], 'number', `CNH.${field} must be numeric`)
    assert.ok(Number.isFinite(quote[field]), `CNH.${field} must be finite`)
  }
  assert.ok(Object.hasOwn(quote, 'delta'))
  assert.ok(quote.delta === null || Number.isFinite(quote.delta))
  assert.equal(quote.timestamp, at)
}

function assertRetainedCnh(actual, previous) {
  assertCnh(actual, previous.timestamp)
  for (const field of ['source', 'cross', 'bid', 'ask', 'high', 'low', 'pct', 'delta', 'timestamp']) {
    assert.deepEqual(actual[field], previous[field], `retained CNH.${field} changed`)
  }
  assertWarning(actual)
}

test('safety: USD 5.40 -> 54 retains its last valid quote while EUR updates', async (t) => {
  const dir = await directory(t)
  await collectBatch(dir, START, batch(START))
  const before = await files(dir)
  assertCnh(before.snapshot.cnh, START)

  const at = START + STEP
  await collectBatch(dir, at, batch(at, { USDBRL: absurdUsd, EURBRL: freshEuro }))
  const { snapshot, intraday } = await files(dir)

  assert.equal(snapshot.quotes.USDBRL.bid, '5.4')
  assert.equal(snapshot.quotes.USDBRL.timestamp, String(START / 1000))
  assertWarning(snapshot.quotes.USDBRL)
  assert.equal(snapshot.quotes.EURBRL.bid, '6.12')
  assert.equal(snapshot.quotes.EURBRL.timestamp, String(at / 1000))
  assertFresh(snapshot.quotes.EURBRL)
  assertRetainedCnh(snapshot.cnh, before.snapshot.cnh)
  assert.deepEqual(intraday.series.USD.points, before.intraday.series.USD.points)
  assert.deepEqual(intraday.series.CNH.points, before.intraday.series.CNH.points)
  assert.deepEqual(intraday.series.EUR.points.at(-1), [at, 6.12])
})

test('safety: repeated rejected quotes preserve original dates and do not append retained points', async (t) => {
  const dir = await directory(t)
  await collectBatch(dir, START, batch(START))
  const before = await files(dir)

  for (const at of [START + STEP, START + 2 * STEP]) {
    await collectBatch(dir, at, batch(at, { USDBRL: absurdUsd }))
    const { snapshot, intraday } = await files(dir)
    assert.equal(snapshot.quotes.USDBRL.bid, '5.4')
    assert.equal(snapshot.quotes.USDBRL.timestamp, String(START / 1000))
    assertWarning(snapshot.quotes.USDBRL)
    assertRetainedCnh(snapshot.cnh, before.snapshot.cnh)
    assert.deepEqual(intraday.series.USD.points, before.intraday.series.USD.points)
    assert.deepEqual(intraday.series.CNH.points, before.intraday.series.CNH.points)
  }
})

test('safety: without a last valid USD, 54 is omitted and other currencies still publish', async (t) => {
  const dir = await directory(t)
  await collectBatch(dir, START, batch(START, { USDBRL: absurdUsd, EURBRL: freshEuro }))
  const { snapshot, intraday } = await files(dir)

  assert.ok(snapshot.quotes.USDBRL == null, 'invalid USD must not be published as a raw quote')
  assert.ok(snapshot.cnh == null, 'CNH cannot be calculated from a rejected source without a previous valid cross')
  assert.equal(snapshot.quotes.EURBRL.bid, '6.12')
  assert.equal(snapshot.quotes.JPYBRL.bid, '0.035')
  assertFresh(snapshot.quotes.EURBRL)
  assertFresh(snapshot.quotes.JPYBRL)
  assert.deepEqual(intraday.series.EUR.points, [[START, 6.12]])
  assert.deepEqual(intraday.series.JPY.points, [[START, 0.035]])
  assert.ok(!intraday.series.USD?.points?.length)
  assert.ok(!intraday.series.CNH?.points?.length)
})

test('safety: a valid USD recovery clears warnings and appends only the new valid observation', async (t) => {
  const dir = await directory(t)
  await collectBatch(dir, START, batch(START))
  const before = await files(dir)
  await collectBatch(dir, START + STEP, batch(START + STEP, { USDBRL: absurdUsd }))

  const at = START + 2 * STEP
  await collectBatch(dir, at, batch(at, { USDBRL: freshUsd }))
  const { snapshot, intraday } = await files(dir)

  assert.equal(snapshot.quotes.USDBRL.bid, '5.41')
  assert.equal(snapshot.quotes.USDBRL.timestamp, String(at / 1000))
  assertFresh(snapshot.quotes.USDBRL)
  assertCnh(snapshot.cnh, at)
  assertFresh(snapshot.cnh)
  assert.deepEqual(intraday.series.USD.points, [[START, 5.4], [at, 5.41]])
  assert.equal(intraday.series.CNH.points.length, 2)
  assert.deepEqual(intraday.series.CNH.points[0], before.intraday.series.CNH.points[0])
  assert.equal(intraday.series.CNH.points[1][0], at)
  assert.ok(Number.isFinite(intraday.series.CNH.points[1][1]))
})

test('safety: nonfinite USD/CNH freezes the previous cross while valid USD continues updating', async (t) => {
  const dir = await directory(t)
  await collectBatch(dir, START, batch(START))
  const before = await files(dir)

  const at = START + STEP
  await collectBatch(dir, at, batch(at, {
    USDBRL: freshUsd,
    USDCNH: { bid: 'NaN', ask: 'Infinity' },
  }))
  const { snapshot, intraday } = await files(dir)

  assert.equal(snapshot.quotes.USDCNH.bid, '6.65')
  assert.equal(snapshot.quotes.USDCNH.ask, '6.651')
  assert.equal(snapshot.quotes.USDCNH.timestamp, String(START / 1000))
  assertWarning(snapshot.quotes.USDCNH)
  assert.equal(snapshot.quotes.USDBRL.bid, '5.41')
  assert.equal(snapshot.quotes.USDBRL.timestamp, String(at / 1000))
  assertFresh(snapshot.quotes.USDBRL)
  assertRetainedCnh(snapshot.cnh, before.snapshot.cnh)
  assert.deepEqual(intraday.series.CNH.points, before.intraday.series.CNH.points)
  assert.deepEqual(intraday.series.USD.points, [[START, 5.4], [at, 5.41]])
})

// A primeira versão do arquivo central não armazenava o cruzamento separado.
test('safety: migrates a valid old snapshot but never retains a contaminated one', async (t) => {
  for (const contaminated of [false, true]) {
    const dir = await directory(t)
    const old = batch(START, contaminated ? { USDBRL: absurdUsd } : {})
    await writeFile(join(dir, 'quotes.json'), JSON.stringify({ generatedAt: START, quotes: old }))
    const at = START + STEP
    await collectBatch(dir, at, batch(at, { USDBRL: absurdUsd }))
    const { snapshot } = await files(dir)
    if (contaminated) {
      assert.equal(snapshot.quotes.USDBRL, undefined)
      assert.equal(snapshot.cnh, null)
    } else {
      assert.equal(snapshot.quotes.USDBRL.timestamp, String(START / 1000))
      assertCnh(snapshot.cnh, START)
      assertWarning(snapshot.cnh)
    }
  }
})

test('safety: missing USD does not stop a valid EUR update', async (t) => {
  const dir = await directory(t)
  await collectBatch(dir, START, batch(START))
  const at = START + STEP
  const incoming = batch(at, { EURBRL: freshEuro })
  delete incoming.USDBRL
  await collectBatch(dir, at, incoming)
  const { snapshot } = await files(dir)
  assert.equal(snapshot.quotes.EURBRL.bid, '6.12')
  assert.equal(snapshot.quotes.USDBRL.timestamp, String(START / 1000))
  assertWarning(snapshot.quotes.USDBRL)
})

import { rawQuoteError, cnhCross } from '../src/quoteSafety.js'
test('safety: rejects invalid required fields, inconsistent prices and future dates', () => {
  const q = batch(START).USDBRL
  for (const field of ['bid', 'ask', 'high', 'low', 'timestamp', 'pctChange']) {
    for (const value of [null, '', ' ', 'NaN', 'Infinity', true, [], {}]) {
      assert.ok(rawQuoteError({ ...q, [field]: value }, 'USDBRL', START), field + ': ' + String(value))
    }
  }
  for (const change of [{ bid: '6' }, { ask: '5' }, { low: '6' }, { high: '5' }, { timestamp: String(START / 1000 + 61) }]) assert.ok(rawQuoteError({ ...q, ...change }, 'USDBRL', START))
  assert.equal(rawQuoteError(batch(START).USDCNH, 'USDCNH', START), '')
  assert.ok(cnhCross(q, batch(START).USDCNH, START), 'raw USD/CNH is not mistaken for CNH/BRL')
})
