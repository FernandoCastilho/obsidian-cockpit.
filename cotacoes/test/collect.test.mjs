// Coleta central: grava as cotações e acumula o intraday sem duplicar, e uma falha da fonte preserva os arquivos anteriores.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collect } from '../scripts/quotes-lib.mjs'

const q = (b, ts) => ({ bid: String(b), ask: String(b + 0.01), high: String(b), low: String(b), pctChange: '0', timestamp: String(ts) })
const api = (ts, b = 5.3) => async () => ({ ok: true, status: 200, json: async () => ({ USDBRL: q(b, ts), EURBRL: q(6.1, ts), JPYBRL: q(0.035, ts), CNYBRL: q(0.74, ts), USDCNH: q(7.1, ts) }) })

test('coleta: grava quotes.json e intraday.json', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'q-'))
  const now = 1_800_000_000_000
  const r = await collect({ dir, fetchFn: api(now / 1000), now, tries: 1 })
  assert.equal(r.ok, true)
  const quotes = JSON.parse(await readFile(join(dir, 'quotes.json'), 'utf8'))
  assert.equal(quotes.generatedAt, now)
  assert.equal(quotes.quotes.USDBRL.bid, '5.3')
  const intra = JSON.parse(await readFile(join(dir, 'intraday.json'), 'utf8'))
  assert.equal(intra.resolution, '5 min')
  assert.deepEqual(Object.keys(intra.series).sort(), ['CNH', 'EUR', 'JPY', 'USD'])
  assert.deepEqual(intra.series.USD.points, [[now, 5.3]])
})

test('coleta: acumula pontos novos e não duplica quando a fonte repete a última cotação', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'q-'))
  const t0 = 1_800_000_000_000
  await collect({ dir, fetchFn: api(t0 / 1000, 5.3), now: t0, tries: 1 })
  await collect({ dir, fetchFn: api((t0 + 300000) / 1000, 5.31), now: t0 + 300000, tries: 1 })
  await collect({ dir, fetchFn: api((t0 + 300000) / 1000, 5.31), now: t0 + 600000, tries: 1 }) // mercado fechado: mesma cotação
  const intra = JSON.parse(await readFile(join(dir, 'intraday.json'), 'utf8'))
  assert.deepEqual(intra.series.USD.points.map((p) => p[1]), [5.3, 5.31])
})

test('coleta: falha da fonte devolve erro e preserva os arquivos anteriores', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'q-'))
  await writeFile(join(dir, 'quotes.json'), '{"generatedAt":1,"quotes":{}}')
  const r = await collect({ dir, fetchFn: async () => ({ ok: false, status: 429 }), tries: 1 })
  assert.equal(r.ok, false)
  assert.match(r.error, /429/)
  assert.equal(JSON.parse(await readFile(join(dir, 'quotes.json'), 'utf8')).generatedAt, 1)
})

test('coleta: usa a chave quando existe', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'q-'))
  let url = ''
  await collect({ dir, key: 'abc 123', fetchFn: async (u) => ((url = String(u)), { ok: false, status: 500 }), tries: 1 })
  assert.match(url, /\?token=abc%20123$/)
  assert.match(url, /USD-BRL,EUR-BRL,JPY-BRL,CNY-BRL,USD-CNH/)
})
