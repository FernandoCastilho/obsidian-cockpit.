import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { addCivilMonths, actualActualCalendarYears, civilDaysBetween, followingBusinessDay, graceOffsetsBackwards, reconcileCreditoPequenasEmpresas } from '../src/bndesCreditoPequenasEmpresas.js'
import { exampleInput } from './fixtures/credito-pequenas-empresas.mjs'
import { visibleRows } from './fixtures/bndes-tfb/visible-evidence.mjs'

const run = (change = () => {}) => { const input = exampleInput(); change(input); return reconcileCreditoPequenasEmpresas(input) }
const observedFields = row => Object.fromEntries(['number', 'date', 'openingCents', 'interestCents', 'principalCents', 'paymentCents'].map(key => [key, row[key]]))

test('13 linhas visíveis coincidem em seis campos, sem importar oráculo no motor', () => {
  const result = run()
  assert.equal(result.ok, true)
  assert.deepEqual(result.rows.map(observedFields), visibleRows)
  assert.equal(result.rows.length, 13)
})

test('primeira cobrança usa 112 dias desde a liberação, não 92 dias ou 3/12', () => {
  const { rows } = run()
  assert.equal(rows[0].periodStart, '2026-10-26')
  assert.equal(rows[0].days, 112)
  assert.equal(rows[0].interestCents, 15252044)
  assert.equal(rows[0].principalCents, 0)
  assert.equal(rows[1].principalCents, 9090909)
  assert.deepEqual(rows.map(row => row.days), [112, 28, 31, 32, 29, 30, 32, 30, 30, 32, 29, 33, 29])
})

test('ano bissexto usa (início, fim], com divisão por ano civil', () => {
  const period = actualActualCalendarYears('2027-12-15', '2028-01-17')
  assert.deepEqual(period.segments, [{ year: 2027, days: 16, denominator: 365 }, { year: 2028, days: 17, denominator: 366 }])
  assert.equal(period.fraction, 16 / 365 + 17 / 366)
  assert.equal(run().rows[11].interestCents, 3073163)
  assert.equal(run().rows[12].interestCents, 2577504)
  assert.equal(actualActualCalendarYears('2027-12-31', '2028-01-01').fraction, 1 / 366)
  assert.equal(actualActualCalendarYears('2028-12-31', '2029-01-01').fraction, 1 / 365)
  assert.equal(actualActualCalendarYears('2028-02-28', '2028-03-01').days, 2)
})

test('decomposição eficiente coincide com contagem independente dia a dia', () => {
  for (const [from, to] of [['1999-12-22', '2001-01-03'], ['2099-12-15', '2100-03-01'], ['2027-12-15', '2028-01-17']]) {
    let sum = 0
    for (let value = Date.parse(`${from}T00:00:00Z`) + 86400000; value <= Date.parse(`${to}T00:00:00Z`); value += 86400000) {
      const year = new Date(value).getUTCFullYear()
      const days = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000
      sum += 1 / days
    }
    assert.ok(Math.abs(actualActualCalendarYears(from, to).fraction - sum) < 1e-12)
  }
})

test('empate exato em ano inteiro usa racional e half-up, não log/exp binários', () => {
  const result = run(input => {
    input.principalCents = 300000004
    input.releaseDate = '2026-02-15'
    input.termMonths = 4
    input.annualRate.decimal = '0.375'
    input.horizon = { lastNominalDate: '2027-02-15', observedRowCount: 1, source: 'Cenário sintético de arredondamento, não a foto.' }
    input.tax.additionalRateDecimal = '0'
    input.tax.dailyRateDecimal = '0'
    input.fees = []
  })
  assert.equal(result.ok, true)
  assert.equal(result.rows[0].interestCents, 112500002)
})

test('meio centavo com expoente fracionário bloqueia sem vazar fluxo parcial', () => {
  const result = run(input => {
    input.principalCents = 300000001
    input.releaseDate = '2028-01-14'
    input.nominalGraceStart.date = '2028-04-15'
    input.termMonths = 4
    input.annualRate.decimal = '1.25'
    input.calendar = { id: 'synthetic-no-holidays', version: 'test-1', completeness: 'partial', source: 'Caso sintético de precisão, não calendário da proposta.', coverageFrom: '2028-01-01', coverageThrough: '2028-08-31', weekendDays: [], holidays: [] }
    input.horizon = { lastNominalDate: '2028-07-15', observedRowCount: 1, source: 'Caso sintético: 183/366 e fator sqrt(2,25).' }
    input.tax.additionalRateDecimal = '0'
    input.tax.dailyRateDecimal = '0'
    input.fees = []
  })
  assert.equal(result.ok, false)
  assert.equal(result.errors[0].code, 'ROUNDING_PRECISION_AMBIGUOUS')
  assert.deepEqual(result.rows, [])
  assert.deepEqual(result.cashFlows, [])
})

test('sábado, domingo e único feriado informado ajustam sem arrastar âncora', () => {
  const { rows } = run()
  assert.deepEqual([rows[3], rows[6], rows[9], rows[11]].map(row => [row.nominalDate, row.date]), [
    ['2027-05-15', '2027-05-17'], ['2027-08-15', '2027-08-16'], ['2027-11-15', '2027-11-16'], ['2028-01-15', '2028-01-17'],
  ])
  assert.equal(rows[4].nominalDate, '2027-06-15')
  assert.equal(rows[4].date, '2027-06-15')
})

test('meses curtos, ano secular e datas inválidas', () => {
  assert.equal(addCivilMonths('2028-01-31', 1, 31), '2028-02-29')
  assert.equal(addCivilMonths('2028-01-31', 2, 31), '2028-03-31')
  assert.equal(addCivilMonths('2100-01-31', 1, 31), '2100-02-28')
  assert.throws(() => civilDaysBetween('2027-02-29', '2027-03-01'), /inválida/)
  assert.throws(() => civilDaysBetween('2026-10-26T00:00:00Z', '2027-02-15'), /formato/)
  assert.throws(() => actualActualCalendarYears('2028-01-01', '2027-01-01'), /anterior/)
})

test('carência retroativa: offsets 1, 4 e 7; nunca data-base', () => {
  assert.deepEqual(graceOffsetsBackwards(7, 3), [1, 4, 7])
  assert.deepEqual(graceOffsetsBackwards(5, 3), [2, 5])
  assert.deepEqual(graceOffsetsBackwards(6, 3), [3, 6])
  assert.deepEqual(graceOffsetsBackwards(3, 3), [3])
  assert.deepEqual(graceOffsetsBackwards(1, 3), [1])
  assert.deepEqual(graceOffsetsBackwards(0, 3), [])
  assert.throws(() => graceOffsetsBackwards(7, 0), /intervalo técnico/)
})

test('motor aplica carência retroativa também fora de múltiplos de três', () => {
  const result = run(input => {
    input.graceMonths = 7
    input.calendar.coverageFrom = '2026-12-01'
    input.horizon.observedRowCount = 11
  })
  assert.equal(result.ok, true)
  assert.deepEqual(result.rows.filter(row => row.inGrace).map(row => row.nominalDate), ['2026-12-15', '2027-03-15', '2027-06-15'])
  assert.equal(result.firstPrincipalPayment.nominalDate, '2027-07-15')
})

test('IOF 94.182,73 é calculado exatamente; memória fiscal não inventa datas ausentes', () => {
  const { iof } = run()
  assert.equal(iof.additionalCents, 1140000)
  assert.equal(iof.dailyCents, 8278273)
  assert.equal(iof.totalCents, 9418273)
  assert.deepEqual(iof.calculationBases.slice(0, 8).map(base => base.elapsedDays), [140, 171, 203, 232, 262, 294, 324, 354])
  assert.deepEqual(iof.calculationBases.slice(8).map(base => base.cappedDays), [365, 365, 365, 365])
  assert.equal(iof.calculationBases.length, 12)
  assert.equal(iof.unshownPrincipalAtCapCents, 190909092)
  assert.equal(iof.unshownPaymentDates, null)
})

test('IOF independente por fórmula racional congelada, sem arredondar por amortização', () => {
  const firstEightDays = [140, 171, 203, 232, 262, 294, 324, 354]
  const weightedBase = firstEightDays.reduce((sum, days) => sum + 9090909n * BigInt(days), 0n) + (300000000n - 8n * 9090909n) * 365n
  const taxUnits = 300000000n * 3800n + weightedBase * 82n
  assert.equal(Number((taxUnits + 500000n) / 1000000n), run().iof.totalCents)
})

test('fluxo de caixa: imposto retido uma vez e tarifa só na primeira cobrança', () => {
  const result = run(), { cashFlows, rows } = result
  assert.equal(result.netDisbursementCents, 290581727)
  assert.equal(cashFlows[0].netCashCents, 290581727)
  assert.equal(cashFlows[0].iofPaidCents, 9418273)
  assert.equal(rows[0].openingCents, 300000000)
  assert.equal(rows[0].paymentCents, 15252044)
  assert.equal(result.firstCashOutCents, 15472044)
  assert.equal(cashFlows[1].feeCents, 220000)
  assert.ok(cashFlows.slice(1).every(row => row.iofPaidCents === 0))
  assert.ok(cashFlows.slice(2).every(row => row.feeCents === 0))
  assert.equal(cashFlows.reduce((sum, flow) => sum + flow.iofPaidCents, 0), 9418273)
})

test('não gera 21 linhas restantes nem total, última parcela ou CET calculado', () => {
  const result = run()
  assert.equal(result.horizon.unshownEventCount, 21)
  assert.equal(result.horizon.completeContractFlow, false)
  assert.equal(result.cashFlows.length, 14)
  assert.equal(result.cashFlowComplete, false)
  assert.equal(result.totalContractCostCents, null)
  assert.equal(result.finalPayment, null)
  assert.deepEqual(result.cet, { reportedAnnualRateDecimal: '0.2001', calculatedAnnualRateDecimal: null, validated: false, status: 'not-validated-incomplete-evidence' })
})

test('taxa inferida, calendário parcial e âncora inferida são visíveis e não viram validação', () => {
  const result = run()
  assert.equal(result.validationStatus, 'estimate-not-contract-validated')
  assert.equal(result.annualRate.status, 'inferred')
  assert.equal(result.annualRate.decimal, '0.175402')
  assert.equal(result.calendar.completeness, 'partial')
  assert.ok(result.warnings.some(text => /taxa precisa foi inferida/.test(text)))
  assert.ok(result.warnings.some(text => /Âncora de carência inferida/.test(text)))
  assert.ok(result.warnings.some(text => /Calendário parcial/.test(text)))
})

test('17,54% arredondados não substituem a entrada precisa nem fecham centavos', () => {
  const result = run(input => { input.annualRate.decimal = '0.1754' })
  assert.equal(result.ok, true)
  assert.notEqual(result.rows[0].interestCents, visibleRows[0].interestCents)
  assert.equal(result.annualRate.decimal, '0.1754')
})

test('saldo conserva principal; juros pagos não capitalizam; SAC pode subir', () => {
  const { rows } = run()
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    assert.equal(row.paymentCents, row.interestCents + row.principalCents)
    assert.equal(row.closingCents, row.openingCents - row.principalCents)
    if (index) assert.equal(row.openingCents, rows[index - 1].closingCents)
  }
  assert.ok(rows[3].paymentCents > rows[2].paymentCents)
  assert.ok(rows[5].paymentCents > rows[4].paymentCents)
})

const invalidCases = [
  ['sem taxa', input => { delete input.annualRate }, 'MISSING_RATE'],
  ['taxa numérica em vez de texto', input => { input.annualRate.decimal = 0.175402 }, 'INVALID_RATE'],
  ['taxa percentual equivocada', input => { input.annualRate.decimal = '17.5402' }, 'INVALID_RATE'],
  ['taxa sem origem', input => { delete input.annualRate.source }, 'MISSING_PROVENANCE'],
  ['taxa negativa', input => { input.annualRate.decimal = '-0.1' }, 'INVALID_RATE'],
  ['sem calendário', input => { delete input.calendar }, 'MISSING_CALENDAR'],
  ['sem feriados explícitos', input => { delete input.calendar.holidays }, 'INVALID_CALENDAR'],
  ['todos dias não úteis', input => { input.calendar.weekendDays = [0, 1, 2, 3, 4, 5, 6] }, 'INVALID_CALENDAR'],
  ['calendário não cobre ajuste', input => { input.calendar.coverageThrough = '2028-01-15' }, 'CALENDAR_COVERAGE'],
  ['sem âncora', input => { delete input.nominalGraceStart }, 'MISSING_ANCHOR'],
  ['data inexistente', input => { input.releaseDate = '2026-02-30' }, 'INVALID_DATE'],
  ['produto Finame', input => { input.productId = 'finame-materiais' }, 'INVALID_ENUM'],
  ['índice TFC', input => { input.indexer = 'tfc' }, 'INVALID_ENUM'],
  ['Price', input => { input.amortizationMethod = 'price' }, 'INVALID_ENUM'],
  ['ACT/365 fixo', input => { input.dayCount = 'act365' }, 'INVALID_ENUM'],
  ['fronteiras invertidas', input => { input.intervalBoundaries = 'include-start-exclude-end' }, 'INVALID_ENUM'],
  ['juros capitalizados', input => { input.graceSchedulePolicy = 'capitalize' }, 'INVALID_ENUM'],
  ['IOF financiado', input => { input.tax.settlement = 'financed' }, 'INVALID_ENUM'],
  ['sem tributo', input => { delete input.tax }, 'MISSING_TAX'],
  ['sem tarifas explícitas', input => { delete input.fees }, 'MISSING_FEES'],
  ['CET informado não é objeto', input => { input.reportedCet = false }, 'INVALID_OBJECT'],
  ['tarifa nula', input => { input.fees = [null] }, 'INVALID_OBJECT'],
  ['tarifa indefinida', input => { input.fees = [undefined] }, 'INVALID_OBJECT'],
  ['tarifa financiada não suportada', input => { input.fees[0].financed = true }, 'UNSUPPORTED_FIELD'],
  ['liberações múltiplas não suportadas', input => { input.disbursements = [] }, 'UNSUPPORTED_FIELD'],
  ['lista semanal esparsa', input => { input.calendar.weekendDays = Array(1) }, 'INVALID_CALENDAR'],
  ['carência maior que prazo', input => { input.graceMonths = 36 }, 'INVALID_INTEGER'],
  ['prazo fracionado', input => { input.termMonths = 36.5 }, 'INVALID_INTEGER'],
  ['valor infinito', input => { input.principalCents = Infinity }, 'INVALID_INTEGER'],
  ['valor em reais não centavos', input => { input.principalCents = 3000000.25 }, 'INVALID_INTEGER'],
  ['residual final inválido', input => { input.principalCents = 50 }, 'INVALID_FINAL_RESIDUAL'],
  ['saída com tarifa excede limite técnico', input => { input.fees[0].amountCents = 1000000000000 }, 'INVALID_INTEGER'],
  ['horizonte sem evidência', input => { delete input.horizon.source }, 'MISSING_HORIZON'],
  ['horizonte divergente', input => { input.horizon.observedRowCount = 14 }, 'HORIZON_MISMATCH'],
  ['modo não suportado', input => { input.mode = 'validated-full-contract' }, 'INVALID_ENUM'],
  ['liberação no mês da cobrança', input => { input.releaseDate = '2027-02-01' }, 'RELEASE_IN_PAYMENT_MONTH'],
  ['liberação posterior à cobrança', input => { input.releaseDate = '2027-03-01' }, 'DATE_ORDER'],
  ['IOF sem prazos até o teto', input => { input.horizon.lastNominalDate = '2027-10-15'; input.horizon.observedRowCount = 9 }, 'IOF_INCOMPLETE_BEFORE_CAP'],
]
for (const [name, change, code] of invalidCases) {
  test(`bloqueio: ${name}`, () => {
    const result = run(change)
    assert.equal(result.ok, false)
    assert.equal(result.errors[0].code, code)
    assert.deepEqual(result.rows, [])
    assert.deepEqual(result.cashFlows, [])
    assert.equal(result.cet.validated, false)
  })
}

test('sem entrada ou entrada primitiva não produz valores', () => {
  for (const input of [null, undefined, 10, 'simular']) assert.equal(reconcileCreditoPequenasEmpresas(input).ok, false)
})

test('calendário é injetado: não inventa feriado 15/11 quando não fornecido', () => {
  const calendar = exampleInput().calendar
  assert.equal(followingBusinessDay('2027-11-15', calendar), '2027-11-16')
  assert.equal(followingBusinessDay('2027-11-15', { ...calendar, holidays: [] }), '2027-11-15')
})

test('determinístico: não modifica entrada e não busca taxa atual', () => {
  const input = exampleInput(), before = structuredClone(input)
  const first = reconcileCreditoPequenasEmpresas(input), second = reconcileCreditoPequenasEmpresas(input)
  assert.deepEqual(input, before)
  assert.deepEqual(first, second)
  assert.equal(run(input => { input.fees = [] }).firstCashOutCents, 15252044)
  assert.equal(run(input => { input.annualRate.decimal = '0' }).rows[0].interestCents, 0)
})

test('datas e valores independem do timezone do processo', () => {
  const cwd = fileURLToPath(new URL('../', import.meta.url))
  const code = "import {exampleInput} from './test/fixtures/credito-pequenas-empresas.mjs'; import {reconcileCreditoPequenasEmpresas as run} from './src/bndesCreditoPequenasEmpresas.js'; process.stdout.write(JSON.stringify(run(exampleInput()).rows))"
  const outputs = ['UTC', 'America/Sao_Paulo', 'Pacific/Kiritimati', 'America/Los_Angeles'].map(TZ => {
    const processResult = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd, env: { ...process.env, TZ }, encoding: 'utf8' })
    assert.equal(processResult.status, 0, processResult.stderr)
    return processResult.stdout
  })
  assert.ok(outputs.every(output => output === outputs[0]))
})

test('Finame: motor e testes preservados, interface revisada com custos financeiros separados', () => {
  const hashes = [
    ['../src/finameMateriais.js', '6fa9f1165eac10b84fcb8be989cd1e92e2eba00033dd6b79aae622704cf63ea7'],
    ['../src/FinameMateriais.jsx', '2d16100d07831efeda069f49043ccd499d95ca3c21528b0402cca0db84b14888'],
    ['./finame-materiais.test.mjs', 'e9d3ade3d94338ed34ca8ac874b323039eb0185eb39c80515443d4052ef2121a'],
  ]
  for (const [path, expected] of hashes) assert.equal(createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex'), expected)
})
