import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { fromInput, toInput, fullWindow, historyRangeError, sliceRange, useHistory, useIntraday } from '../src/useHistory.js'

// Renderer mínimo, sem navegador/pacotes extras: exerce os hooks React reais e sua limpeza.
// Novos objetos Date por render reproduzem a chamada dos cards. Um loop falha em 12 renders.
function hookRenderer(renderHook) {
  const slots = []
  let cursor = 0, dirty = true, value, effects = [], renders = 0
  const dispatcher = {
    useState(initial) {
      const index = cursor++
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial }
      return [slots[index].value, (next) => {
        const previous = slots[index].value
        const result = typeof next === 'function' ? next(previous) : next
        if (!Object.is(previous, result)) { slots[index].value = result; dirty = true }
      }]
    },
    useEffect(effect, deps) {
      const index = cursor++, previous = slots[index]
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) {
        effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: effect() } })
      }
    },
  }
  const render = () => {
    cursor = 0; dirty = false; effects = []
    const current = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher
    const original = current.current
    current.current = dispatcher
    try { value = renderHook() } finally { current.current = original }
    renders++
    effects.forEach((effect) => effect())
    return value
  }
  return {
    render,
    get renders() { return renders },
    async settle() {
      for (let i = 0; i < 12; i++) {
        if (dirty) render()
        await new Promise((resolve) => setImmediate(resolve))
        if (!dirty) return value
      }
      assert.fail('O hook não estabilizou: provável loop de dependências Date.')
    },
    close() { slots.forEach((slot) => slot?.cleanup?.()) },
  }
}
function mockFetch(t, fn) {
  const previous = globalThis.fetch
  globalThis.fetch = fn
  t.after(() => { globalThis.fetch = previous })
}
const json = (data) => ({ ok: true, json: async () => data })
const at = (date, hour = 12) => { const d = fromInput(date); d.setHours(hour); return d.getTime() }
const point = (date, bid) => ({ t: at(date), bid, high: bid, low: bid })
const shift = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d }

test('datas: rejeita vazio, datas inexistentes e intervalo invertido; aceita mesmo dia e bissexto', () => {
  for (const input of ['', '2026-02-31', '2026-02-29', '2026-13-01', 'nada']) assert.ok(Number.isNaN(fromInput(input).getTime()), input)
  assert.equal(toInput(fromInput('2024-02-29')), '2024-02-29')
  assert.match(historyRangeError(fromInput(''), fromInput('2026-10-01')), /válidas/)
  assert.match(historyRangeError(fromInput('2026-10-02'), fromInput('2026-10-01')), /inicial/)
  assert.equal(historyRangeError(fromInput('2026-10-01'), fromInput('2026-10-01')), '')
})

test('recorte: início e fim inclusivos, sem referência anterior ou dia seguinte', () => {
  const points = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((day, i) => point(day, 5 + i / 10))
  assert.deepEqual(sliceRange(points, fromInput('2026-10-02'), fromInput('2026-10-03')).map((p) => p.bid), [5.1, 5.2])
  assert.deepEqual(sliceRange(points, fromInput('2026-10-02'), fromInput('2026-10-02')).map((p) => p.bid), [5.1])
  assert.deepEqual(sliceRange(points, fromInput('2026-10-03'), fromInput('2026-10-02')), [])
  assert.deepEqual(sliceRange(points, fromInput(''), fromInput('2026-10-02')), [])
})

test('recorte: dia civil inclui todas as horas nas duas mudanças de horário de verão', () => {
  const previous = process.env.TZ
  process.env.TZ = 'America/New_York'
  try {
    for (const day of ['2026-03-08', '2026-11-01']) {
      const start = fromInput(day), next = shift(start, 1)
      const points = [{ t: start.getTime() - 1 }, { t: start.getTime() }, { t: next.getTime() - 1 }, { t: next.getTime() }]
      assert.deepEqual(sliceRange(points, start, start), points.slice(1, 3))
    }
    const win = fullWindow(fromInput('2026-11-02'))
    assert.equal(win.start.getHours(), 0)
    assert.equal(win.end.getHours(), 0)
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
})

test('histórico: 7/30/180/360 dias e início/fim recortam cache sem loop ou nova consulta', async (t) => {
  const win = fullWindow()
  const rates = Object.fromEntries(Array.from({ length: 360 }, (_, i) => [toInput(shift(win.start, i)), { BRL: 5 + i / 1000 }]))
  let calls = 0
  mockFetch(t, async () => { calls++; return json({ rates }) })
  let start = shift(win.end, -6), end = win.end
  const renderer = hookRenderer(() => useHistory('TEST-DAILY', new Date(start), new Date(end)))
  t.after(() => renderer.close())
  for (const count of [7, 30, 180, 360]) {
    start = shift(win.end, 1 - count)
    renderer.render()
    const result = await renderer.settle()
    assert.equal(result.status, 'ok')
    assert.equal(result.data.points.length, count)
    assert.equal(toInput(new Date(result.data.points[0].t)), toInput(start))
    assert.equal(toInput(new Date(result.data.points.at(-1).t)), toInput(end))
  }
  start = shift(win.end, -20); end = shift(win.end, -10)
  renderer.render()
  assert.equal((await renderer.settle()).data.points.length, 11)
  assert.equal(calls, 1)
  const renders = renderer.renders
  renderer.render()
  await renderer.settle()
  assert.equal(renderer.renders, renders + 1)
})

test('histórico: reserva antiga é recortada e não inventa pontos em dias sem dados', async (t) => {
  mockFetch(t, async () => json({ rates: { '2020-01-03': { BRL: 4 }, '2020-01-06': { BRL: 4.1 }, '2020-01-07': { BRL: 4.2 } } }))
  let end = fromInput('2020-01-06')
  const renderer = hookRenderer(() => useHistory('TEST-OLD', fromInput('2020-01-04'), new Date(end)))
  t.after(() => renderer.close())
  assert.deepEqual((await renderer.settle()).data.points.map((p) => p.bid), [4.1])
  end = fromInput('2020-01-05')
  renderer.render()
  const empty = await renderer.settle()
  assert.equal(empty.status, 'error')
  assert.match(empty.error, /Sem cotações no período/)
})

test('histórico: intervalo vazio no cache mostra erro, não envia [] ao gráfico', async (t) => {
  const win = fullWindow()
  mockFetch(t, async () => json({ rates: { [toInput(win.end)]: { BRL: 5.5 } } }))
  let end = win.end
  const renderer = hookRenderer(() => useHistory('TEST-EMPTY', shift(win.end, -3), new Date(end)))
  t.after(() => renderer.close())
  assert.equal((await renderer.settle()).status, 'ok')
  end = shift(win.end, -1)
  renderer.render()
  const result = await renderer.settle()
  assert.equal(result.status, 'error')
  assert.match(result.error, /Sem cotações/)
})

test('histórico: datas inválidas não consultam fonte nem conservam gráfico anterior', async (t) => {
  let calls = 0
  mockFetch(t, async () => { calls++; throw new Error('não deveria consultar') })
  for (const [a, b] of [['', '2026-10-01'], ['2026-10-03', '2026-10-01']]) {
    const renderer = hookRenderer(() => useHistory('TEST-INVALID', fromInput(a), fromInput(b)))
    assert.equal((await renderer.settle()).status, 'error')
    renderer.close()
  }
  assert.equal(calls, 0)
})

test('histórico: resposta antiga não substitui seleção mais recente', async (t) => {
  const pending = []
  mockFetch(t, () => new Promise((resolve) => pending.push(resolve)))
  let date = '2020-01-06'
  const renderer = hookRenderer(() => useHistory('TEST-RACE', fromInput(date), fromInput(date)))
  t.after(() => renderer.close())
  renderer.render(); await renderer.settle()
  date = '2020-01-07'
  renderer.render(); await renderer.settle()
  assert.equal(pending.length, 2)
  pending[1](json({ rates: { '2020-01-07': { BRL: 5.7 } } }))
  assert.equal((await renderer.settle()).data.points[0].bid, 5.7)
  pending[0](json({ rates: { '2020-01-06': { BRL: 5.6 } } }))
  assert.equal((await renderer.settle()).data.points[0].bid, 5.7)
})

test('intraday: Date do mesmo dia estabiliza e outro dia troca pontos', async (t) => {
  let calls = 0
  mockFetch(t, async () => {
    calls++
    return json({ series: { USD: { points: [[at('2026-10-01', 10), 5.1], [at('2026-10-01', 11), 5.2], [at('2026-10-02', 10), 5.3], [at('2026-10-02', 11), 5.4], [at('2026-10-03', 11), 5.0376]] } } })
  })
  let date = '2026-10-01'
  const renderer = hookRenderer(() => useIntraday('USD', fromInput(date)))
  t.after(() => renderer.close())
  assert.deepEqual((await renderer.settle()).data.points.map((p) => p.bid), [5.1, 5.2])
  const renders = renderer.renders
  renderer.render(); await renderer.settle()
  assert.equal(renderer.renders, renders + 1)
  date = '2026-10-02'
  renderer.render()
  assert.deepEqual((await renderer.settle()).data.points.map((p) => p.bid), [5.3, 5.4])
  assert.equal(calls, 1)
  date = '2026-10-03'
  renderer.render()
  assert.deepEqual((await renderer.settle()).data.points.map((p) => p.bid), [5.0376])
  date = '2026-10-04'
  renderer.render()
  assert.equal((await renderer.settle()).status, 'error')
})
