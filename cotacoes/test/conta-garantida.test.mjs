import test from 'node:test'
import assert from 'node:assert/strict'
import { cgDate, cgAddDays, cgToday, cgInitialForm, parseContaGarantidaForm, simulateContaGarantida } from '../src/contaGarantida.js'

const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`)
const event = (date, draw = 0, payment = 0) => ({ date, draw, payment })
const scenario = (overrides = {}) => ({ start: '2026-11-05', end: '2026-11-15', rate: 3, rateBase: 30, conversion: 'proportional', dayCount: 'calendar', iofDaily: 0.0082, iofAdditional: 0.38, events: [event('2026-11-05', 100000)], ...overrides })
const form = (overrides = {}) => ({ ...cgInitialForm('2026-11-05'), amount: '100.000,00', rate: '3', ...overrides })

test('utilização única por dez dias: juros e IOF separados do principal', () => {
  const { errors, result } = parseContaGarantidaForm(form())
  assert.deepEqual(errors, {})
  assert.equal(result.ok, true)
  close(result.totals.interest, 1000)
  close(result.totals.dailyIof, 82)
  close(result.totals.additionalIof, 380)
  close(result.totals.cost, 1462)
  assert.equal(result.balance, 0)
  assert.equal(result.rows.length, 11)
  assert.equal(result.totals.interestDays, 10)
  assert.ok(result.rows.slice(0, 10).every(row => row.balance === 100000))
  assert.equal(result.rows.at(-1).payment, 100000)
})

test('datas reais, bissexto, fuso de São Paulo e fim de mês', () => {
  assert.equal(cgDate('2026-02-29'), null)
  assert.equal(cgDate('2026-13-01'), null)
  assert.equal(cgDate('2026-11-31'), null)
  assert.equal(cgDate('2026-1-01'), null)
  assert.equal(cgDate('1899-12-31'), null)
  assert.ok(cgDate('2028-02-29'))
  assert.equal(cgAddDays('2028-02-28', 2), '2028-03-01')
  assert.equal(cgAddDays('2026-12-31', 1), '2027-01-01')
  assert.equal(cgToday(new Date('2026-11-06T01:00:00Z')), '2026-11-05')
})

test('data de quitação e duração produzem o mesmo cálculo', () => {
  const a = parseContaGarantidaForm(form()).result
  const b = parseContaGarantidaForm(form({ dateMode: 'end', end: '2026-11-15' })).result
  assert.deepEqual(a, b)
})

test('lançamentos: aumento, amortização e reutilização geram IOF adicional somente nos acréscimos', () => {
  const result = simulateContaGarantida(scenario({ end: '2026-11-09', events: [event('2026-11-05', 10000), event('2026-11-06', 5000), event('2026-11-07', 0, 8000), event('2026-11-08', 6000), event('2026-11-09', 0, 13000)] }))
  assert.deepEqual(result.rows.map(row => row.balance), [10000, 15000, 7000, 13000, 0])
  assert.deepEqual(result.rows.map(row => row.additionalBase), [10000, 5000, 0, 6000, 0])
  close(result.totals.interest, 45)
  close(result.totals.dailyIof, 3.69)
  close(result.totals.additionalIof, 79.8)
  close(result.totals.cost, 128.49)
})

test('mesma data é consolidada sem ordem intradia, e linhas desordenadas são ordenadas por data', () => {
  const events = [event('2026-11-06', 0, 1000), event('2026-11-05', 1000), event('2026-11-05', 1000), event('2026-11-05', 0, 500)]
  const a = simulateContaGarantida(scenario({ end: '2026-11-06', events }))
  const b = simulateContaGarantida(scenario({ end: '2026-11-06', events: events.toReversed ? events.toReversed() : [...events].reverse() }))
  assert.deepEqual(a, b)
  assert.deepEqual(a.rows.map(row => row.balance), [1500, 500])
  assert.deepEqual(a.rows.map(row => row.additionalBase), [1500, 0])
})

test('utilização e quitação no mesmo dia têm saldo líquido zero na convenção explicitada', () => {
  const result = parseContaGarantidaForm(form({ duration: '0' })).result
  assert.equal(result.balance, 0)
  assert.equal(result.totals.cost, 0)
  assert.equal(result.totals.draw, result.totals.payment)
})

test('valor e taxa zero são válidos; vazio não representa taxa zero', () => {
  assert.equal(parseContaGarantidaForm(form({ amount: '0', rate: '0' })).result.totals.cost, 0)
  const zeroRate = parseContaGarantidaForm(form({ rate: '0' })).result
  assert.equal(zeroRate.totals.interest, 0)
  close(zeroRate.totals.iof, 462)
  assert.ok(parseContaGarantidaForm(form({ rate: '' })).errors.rate)
  assert.equal(parseContaGarantidaForm(form({ amount: '' })).result, null)
})

test('juros somente em dias úteis não suspendem IOF no fim de semana ou feriado', () => {
  const result = simulateContaGarantida(scenario({ start: '2026-11-06', end: '2026-11-10', dayCount: 'business', holidays: ['2026-11-09'], events: [event('2026-11-06', 100000), event('2026-11-10', 0, 100000)] }))
  close(result.totals.interest, 100)
  close(result.totals.dailyIof, 32.8)
  assert.deepEqual(result.rows.map(row => row.countsInterest), [true, false, false, false, true])
  assert.equal(result.totals.interestDays, 1)
})

test('conversão equivalente define a taxa, mas não capitaliza juros nem IOF', () => {
  const result = parseContaGarantidaForm(form({ conversion: 'equivalent' })).result
  const daily = Math.pow(1.03, 1 / 30) - 1
  close(result.totals.interest, 100000 * daily * 10, 1e-7)
  close(result.totals.iof, 462)
  assert.ok(result.rows.slice(0, 10).every(row => row.balance === 100000))
  assert.equal(simulateContaGarantida(scenario({ capitalization: 'daily' })).ok, false)
  assert.equal(simulateContaGarantida(scenario({ events: [{ ...event('2026-11-05', 10000), charges: 10 }] })).ok, false)
})

test('bases 360, 365, 252 e diária respeitam divisor escolhido sem capitalização', () => {
  for (const rateBase of [360, 365, 252, 1]) {
    const result = simulateContaGarantida(scenario({ rate: 1, rateBase, settleAllAtEnd: true }))
    close(result.totals.interest, 100000 * 0.01 / rateBase * 10)
  }
})

test('virada de mês separa somatórios sem reaplicar adicional ao saldo existente', () => {
  const result = simulateContaGarantida(scenario({ start: '2026-10-30', end: '2026-11-02', events: [event('2026-10-30', 10000)] }))
  assert.deepEqual(result.months.map(month => month.days), [2, 2])
  assert.deepEqual(result.months.map(month => month.additionalBase), [10000, 0])
  close(result.months[0].dailyIof, 1.64)
  close(result.months[1].dailyIof, 1.64)
  assert.ok(result.rows.every(row => row.balance === 10000))
  close(result.totals.interest, 40)
})

test('rotativo adimplente não recebe teto genérico de 365 dias', () => {
  const result = simulateContaGarantida(scenario({ end: cgAddDays('2026-11-05', 400), settleAllAtEnd: true }))
  close(result.totals.dailyIof, 3280)
  close(result.totals.interest, 40000)
  close(result.totals.additionalIof, 380)
})

test('amortização integral não devolve IOF e reutilização posterior paga novo adicional', () => {
  const result = simulateContaGarantida(scenario({ end: '2026-11-08', events: [event('2026-11-05', 1000), event('2026-11-06', 0, 1000), event('2026-11-07', 1000), event('2026-11-08', 0, 1000)] }))
  close(result.totals.additionalIof, 7.6)
  close(result.totals.dailyIof, 0.164)
  assert.equal(result.balance, 0)
})

test('sobrepagamento, lançamentos fora do período e inputs inválidos bloqueiam', () => {
  for (const overrides of [
    { events: [event('2026-11-05', 1000, 1001)] }, { events: [event('2026-11-04', 1000)] }, { events: [event('2026-11-16', 1000)] },
    { rate: NaN }, { rate: -1 }, { taxProfile: 'manual' }, { taxProfile: 'simples', eligible: false }, { start: '2026-02-29' }, { end: '2026-11-04' },
    { holidays: ['2026-02-30'] }, { dayCount: 'random' }, { conversion: 'random' }, { rateBase: 31 }, { events: [event('2026-11-05', -1)] },
  ]) assert.equal(simulateContaGarantida(scenario(overrides)).ok, false, JSON.stringify(overrides))
})

test('formulário não trata separadores monetários estrangeiros ou taxa incompleta como valor válido', () => {
  for (const amount of ['1000.00', '1,000.00', '-100', '1.00,00', 'abc']) assert.ok(parseContaGarantidaForm(form({ amount })).errors.amount)
  for (const rate of ['-1', '1,2,3', 'abc']) assert.ok(parseContaGarantidaForm(form({ rate })).errors.rate)
  assert.ok(parseContaGarantidaForm(form({ duration: '1,5' })).errors.duration)
  assert.ok(parseContaGarantidaForm(form({ duration: '3661' })).errors.duration)
})

test('histórico anterior e perfil manual são bloqueados; override não altera IOF', () => {
  assert.ok(parseContaGarantidaForm(form({ start: '2025-07-16' })).errors.taxProfile)
  assert.equal(parseContaGarantidaForm(form({ taxProfile: 'manual', iofDaily: '0', iofAdditional: '0' })).result, null)
  const r = simulateContaGarantida(scenario({ iofDaily: 0, iofAdditional: 0, settleAllAtEnd: true }))
  close(r.totals.iof, 462)
  assert.ok(parseContaGarantidaForm(form()).warnings.length)
})

test('Simples/MEI só libera referência reduzida com valor contratual e confirmação explícita', () => {
  assert.equal(parseContaGarantidaForm(form({ taxProfile: 'simples' })).result, null)
  assert.equal(parseContaGarantidaForm(form({ taxProfile: 'simples', operationValue: '30.000', eligible: true })).result.ok, false)
  close(parseContaGarantidaForm(form({ taxProfile: 'simples', amount: '1.000', operationValue: '30.001', eligible: true })).result.totals.dailyIof, 0.82)
  const eligible = parseContaGarantidaForm(form({ taxProfile: 'simples', amount: '30.000', operationValue: '30.000', eligible: true }))
  assert.equal(eligible.result.ok, true)
  close(eligible.result.totals.dailyIof, 8.22)
  close(eligible.result.totals.additionalIof, 114)
})

test('inadimplência, renegociação e principal definido são bloqueados, não simulados com a regra normal', () => {
  const parsed = parseContaGarantidaForm(form({ status: 'unsupported' }))
  assert.equal(parsed.result, null)
  assert.match(parsed.errors.status, /regras próprias/)
})

test('lançamentos em branco valem zero mas datas vazias são erro', () => {
  const parsed = parseContaGarantidaForm(form({ mode: 'ledger' }))
  assert.equal(parsed.result.totals.cost, 0)
  const invalid = parseContaGarantidaForm(form({ mode: 'ledger', rows: [{ id: 'first', date: '', draw: '1000', payment: '' }] }))
  assert.ok(invalid.errors['row-first-date'])
  assert.equal(invalid.result, null)
})

test('somatórios do mês reconciliam com totais e balanço de principal', () => {
  const result = simulateContaGarantida(scenario({ start: '2026-10-30', end: '2026-12-03', events: [event('2026-10-30', 10000.01), event('2026-11-07', 800.19, 300.11), event('2026-12-03', 0, 100)] }))
  close(result.balance, result.totals.draw - result.totals.payment)
  for (const key of ['interest', 'dailyIof', 'additionalIof', 'dailyBase', 'additionalBase']) close(result.totals[key], result.months.reduce((sum, month) => sum + month[key], 0))
  close(result.totals.cost, result.totals.interest + result.totals.iof)
})

test('feriados inativos não bloqueiam dias corridos após troca de convenção', () => {
  assert.equal(parseContaGarantidaForm(form({ dayCount: 'calendar', holidays: 'inválido' })).result.ok, true)
  assert.equal(parseContaGarantidaForm(form({ dayCount: 'business', holidays: 'inválido' })).result, null)
})
