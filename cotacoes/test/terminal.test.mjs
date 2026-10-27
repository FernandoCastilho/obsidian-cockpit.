import assert from 'node:assert/strict'
import test from 'node:test'
import { changeText, feedState, heatItems, heatStrength, kpiItems, parseCommand, tapeItems } from '../src/terminal.js'

const q = (bid, pct, extra = {}) => ({ bid, ask: bid, high: bid, low: bid, pct, timestamp: Date.now(), ...extra })
const quotes = { USD: q(5, 1, { source: 'USD' }), EUR: q(6, -0.5, { source: 'EUR' }), JPY: q(0.034, 0.2, { source: 'JPY' }), CNH: q(0.74, 0.1, { source: 'CNH' }) }
const rates = [
  { key: 'selic', label: 'Selic', value: 14.25, delta: 0 },
  { key: 'cdi', label: 'CDI', value: 14.15, delta: null },
  { key: 'di1', label: 'DI 1 ano', value: 13.8, delta: 0.04 },
  { key: 'ust10', label: 'Treasury 10a', value: 4.18, delta: -0.03 },
]

test('comandos: moedas, paridade e seções, com variações de escrita', () => {
  assert.deepEqual(parseCommand('USDBRL Curncy'), { kind: 'currency', code: 'USD' })
  assert.deepEqual(parseCommand(' usd/brl <GO> '), { kind: 'currency', code: 'USD' })
  assert.deepEqual(parseCommand('dólar'), { kind: 'currency', code: 'USD' })
  assert.deepEqual(parseCommand('iene'), { kind: 'currency', code: 'JPY' })
  assert.deepEqual(parseCommand('CNY'), { kind: 'currency', code: 'CNH' })
  assert.deepEqual(parseCommand('EUR/USD'), { kind: 'pair' })
  assert.deepEqual(parseCommand('juros'), { kind: 'tab', id: 'juros', sub: '' })
  assert.deepEqual(parseCommand('Notícias'), { kind: 'tab', id: 'noticias', sub: '' })
  assert.deepEqual(parseCommand('finimp'), { kind: 'tab', id: 'calculadora', sub: 'finimp' })
  assert.deepEqual(parseCommand('cenários'), { kind: 'tab', id: 'cenarios', sub: '' })
})

test('comando desconhecido ou vazio não navega', () => {
  assert.equal(parseCommand(''), null)
  assert.equal(parseCommand('   '), null)
  assert.equal(parseCommand(undefined), null)
  assert.equal(parseCommand('PETR4'), null)
})

test('variação: sinal, vírgula decimal e unidade; ausência não vira zero', () => {
  assert.equal(changeText(0.42), '+0,42%')
  assert.equal(changeText(-1.1234), '−1,12%')
  assert.equal(changeText(0), '0,00%')
  assert.equal(changeText(0.04, 'bps'), '+4 bps')
  assert.equal(changeText(-0.03, 'bps'), '−3 bps')
  assert.equal(changeText(null), null)
  assert.equal(changeText(NaN, 'bps'), null)
})

test('faixa: câmbio, paridade e juros, com tom pela direção', () => {
  const items = tapeItems(quotes, rates)
  assert.deepEqual(items.map((i) => i.label), ['USD/BRL', 'EUR/BRL', 'JPY/BRL', 'CNH/BRL', 'EUR/USD', 'Selic', 'CDI', 'DI 1 ano', 'Treasury 10a'])
  assert.equal(items[0].value, '5,0000')
  assert.equal(items[2].value, '0,03400')
  assert.equal(items[0].tone, 'up')
  assert.equal(items[1].tone, 'down')
  const parity = items.find((i) => i.key === 'EURUSD')
  assert.equal(parity.value, '1,2000')
  assert.equal(items.find((i) => i.key === 'selic').tone, 'flat')
  assert.equal(items.find((i) => i.key === 'cdi').text, null)
})

test('cotação de reserva (BCE) não exibe variação do dia nem entra na paridade', () => {
  const fb = { ...quotes, EUR: q(6, 0, { source: 'EUR', fallback: true }) }
  const items = tapeItems(fb, [])
  assert.equal(items.find((i) => i.key === 'EURBRL').text, null)
  assert.equal(items.find((i) => i.key === 'EURUSD'), undefined)
  assert.deepEqual(heatItems(fb, []).map((i) => i.key), ['USDBRL', 'JPYBRL', 'CNHBRL'])
})

test('sem dados: nada é inventado', () => {
  assert.deepEqual(tapeItems(null, undefined), [])
  assert.deepEqual(kpiItems(undefined, []), [])
  assert.deepEqual(heatItems({}, null), [])
})

test('indicadores: dólar, euro, paridade e juros do Brasil, nessa ordem', () => {
  assert.deepEqual(kpiItems(quotes, rates).map((i) => i.key), ['USDBRL', 'EURBRL', 'EURUSD', 'selic', 'cdi', 'di1'])
})

test('mapa de variação: só itens com variação; juros longos em bps', () => {
  const heat = heatItems(quotes, rates)
  assert.deepEqual(heat.map((i) => i.key), ['USDBRL', 'EURBRL', 'JPYBRL', 'CNHBRL', 'EURUSD', 'di1', 'ust10'])
  assert.equal(heat.find((i) => i.key === 'ust10').text, '−3 bps')
})

test('intensidade do mapa: proporcional e limitada a 1', () => {
  assert.equal(heatStrength({ change: 0.6, unit: 'pct' }), 0.5)
  assert.equal(heatStrength({ change: 5, unit: 'pct' }), 1)
  assert.equal(heatStrength({ change: -0.075, unit: 'bps' }), 0.5)
  assert.equal(heatStrength({ change: null, unit: 'pct' }), 0)
})

test('estado dos dados: erro vence; antigo avisa; sem cotação ainda carrega', () => {
  assert.equal(feedState({ error: 'x', aged: false, hasQuotes: true }), 'err')
  assert.equal(feedState({ error: null, aged: false, hasQuotes: false }), 'loading')
  assert.equal(feedState({ error: null, aged: true, hasQuotes: true }), 'delayed')
  assert.equal(feedState({ error: null, aged: undefined, hasQuotes: true }), 'ok')
})
