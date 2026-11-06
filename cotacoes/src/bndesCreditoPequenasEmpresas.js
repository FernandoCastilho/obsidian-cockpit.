// Protótipo isolado. Não conectado à interface nem ao motor Finame.
// Reconcilia somente o horizonte documentado; não certifica contrato, tributo ou CET.
const DAY = 86_400_000
const MAX_CENTS = 1_000_000_000_000 // limite técnico, não limite de crédito do produto
const OFFICIAL_SOURCE = 'https://www.bndes.gov.br/sbn/BNDES_online/Arquivos/01-22Cir13-Anexo-I-Procedimentos-Operacionais.pdf'

export const CREDIT_PROFILE = Object.freeze({
  productId: 'bndes-credito-pequenas-empresas',
  lenderProfileId: 'cenario-usuario-tfb-2026-10',
  version: '0.2.1-research',
  status: 'inferred',
  scope: 'Reconciliação de cenário de teste montado pelo usuário. Não é proposta emitida por banco nem regra geral de Finame/TFC.',
  evidenceOrigin: Object.freeze({ kind: 'user-authored-test', source: 'Esclarecimento explícito do usuário em 05/11/2026: ele montou as imagens para testar com base em cálculos oficiais.' }),
  asOf: '2026-11-05',
  dayCount: 'actual-actual-calendar-year',
  intervalBoundaries: 'exclude-start-include-end',
  businessDayAdjustment: 'following',
  rules: Object.freeze([
    Object.freeze({ rule: 'grace-backwards', status: 'confirmed-source-applicability-unverified', source: OFFICIAL_SOURCE, section: '5.3', scope: 'Aplicabilidade depende da operação.' }),
    Object.freeze({ rule: 'following', status: 'observed', source: 'Foto do cenário de teste e Anexo I, item 5.', scope: 'Somente datas verificadas.' }),
    Object.freeze({ rule: 'interest-day-count', status: 'inferred', source: 'Reconciliação das 34 linhas nas três fotos completas.', scope: 'Cenário de teste fotografado.' }),
    Object.freeze({ rule: 'iof-settlement', status: 'observed', source: 'Nota do IOF na foto.', scope: 'Retido na liberação deste cenário de teste.' }),
    Object.freeze({ rule: 'fee-settlement', status: 'observed', source: 'Nota da tarifa na foto.', scope: 'Primeira cobrança deste cenário de teste.' }),
  ]),
})

class InputError extends Error {
  constructor(code, message) { super(message); this.name = 'InputError'; this.code = code }
}
const requireValue = (condition, code, message) => { if (!condition) throw new InputError(code, message) }
const isText = value => typeof value === 'string' && value.trim().length > 0
const objectFields = (value, fields, field) => {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), 'INVALID_OBJECT', `${field}: objeto obrigatório.`)
  const extra = Object.keys(value).filter(key => !fields.includes(key))
  requireValue(extra.length === 0, 'UNSUPPORTED_FIELD', `${field}: campos não suportados (${extra.join(', ')}).`)
}
const oneOf = (value, allowed, field) => requireValue(allowed.includes(value), 'INVALID_ENUM', `${field}: valor não suportado.`)
const int = (value, min, max, field) => requireValue(Number.isSafeInteger(value) && value >= min && value <= max, 'INVALID_INTEGER', `${field}: inteiro fora do intervalo técnico.`)
const money = (value, field, min = 0) => int(value, min, MAX_CENTS, field)
const isoFromStamp = value => new Date(value).toISOString().slice(0, 10)

function stamp(iso) {
  requireValue(typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso), 'INVALID_DATE', 'Data civil obrigatória no formato YYYY-MM-DD.')
  const value = Date.parse(`${iso}T00:00:00Z`)
  requireValue(Number.isFinite(value) && isoFromStamp(value) === iso && iso >= '1900-01-01' && iso <= '2199-12-31', 'INVALID_DATE', `Data civil inválida: ${iso}.`)
  return value
}
export function civilDaysBetween(from, to) { return (stamp(to) - stamp(from)) / DAY }
export function isLeapYear(year) { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) }

export function addCivilMonths(iso, count, anchorDay) {
  const time = stamp(iso)
  int(count, -1200, 1200, 'Meses')
  int(anchorDay, 1, 31, 'Dia nominal')
  const d = new Date(time), year = d.getUTCFullYear(), month = d.getUTCMonth() + count
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const result = isoFromStamp(Date.UTC(year, month, Math.min(last, anchorDay)))
  stamp(result)
  return result
}

// Retorna também a decomposição auditável. O primeiro dia contado é início + 1.
export function actualActualCalendarYears(from, to) {
  const start = stamp(from), end = stamp(to)
  requireValue(end >= start, 'DATE_ORDER', 'Fim anterior ao início do período.')
  const segments = []
  let cursor = start + DAY
  while (cursor <= end) {
    const year = new Date(cursor).getUTCFullYear()
    const segmentEnd = Math.min(end, Date.UTC(year + 1, 0, 1) - DAY)
    const days = (segmentEnd - cursor) / DAY + 1, denominator = isLeapYear(year) ? 366 : 365
    segments.push({ year, days, denominator })
    cursor = segmentEnd + DAY
  }
  return { days: (end - start) / DAY, fraction: segments.reduce((sum, part) => sum + part.days / part.denominator, 0), segments }
}

function provenance(value, field) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'MISSING_PROVENANCE', `${field}: fonte e status obrigatórios.`)
  requireValue(isText(value.source), 'MISSING_PROVENANCE', `${field}: fonte obrigatória.`)
  oneOf(value.status, ['observed', 'inferred', 'contract-confirmed'], `${field}.status`)
}

// Decimal em fração, nunca em percentual: 0.175402 representa 17,5402% a.a.
// Não há composição automática de taxas arredondadas do cabeçalho.
function decimal(value, field, max = 1) {
  requireValue(typeof value === 'string' && /^(?:0|[1-9]\d*)(?:\.\d{1,12})?$/.test(value), 'INVALID_RATE', `${field}: use decimal exato como texto, com até 12 casas.`)
  const numeric = Number(value)
  requireValue(Number.isFinite(numeric) && numeric <= max, 'INVALID_RATE', `${field}: taxa fora do intervalo técnico.`)
  const [whole, fraction = ''] = value.split('.')
  return { numeric, numerator: BigInt(whole + fraction), denominator: 10n ** BigInt(fraction.length) }
}

function validateCalendar(calendar) {
  requireValue(calendar && isText(calendar.id) && isText(calendar.version) && isText(calendar.source), 'MISSING_CALENDAR', 'Informe calendário explícito, versão, fonte e cobertura.')
  objectFields(calendar, ['id', 'version', 'source', 'completeness', 'coverageFrom', 'coverageThrough', 'weekendDays', 'holidays'], 'calendar')
  oneOf(calendar.completeness, ['partial', 'contract-confirmed'], 'calendar.completeness')
  requireValue(stamp(calendar.coverageFrom) <= stamp(calendar.coverageThrough), 'CALENDAR_COVERAGE', 'Cobertura de calendário invertida.')
  requireValue(Array.isArray(calendar.weekendDays) && calendar.weekendDays.length < 7 && Array.from(calendar.weekendDays).every(day => Number.isInteger(day) && day >= 0 && day <= 6) && new Set(calendar.weekendDays).size === calendar.weekendDays.length, 'INVALID_CALENDAR', 'Dias não úteis semanais inválidos.')
  requireValue(Array.isArray(calendar.holidays), 'INVALID_CALENDAR', 'Feriados precisam ser fornecidos explicitamente, inclusive lista vazia.')
  for (const holiday of calendar.holidays) {
    stamp(holiday)
    requireValue(holiday >= calendar.coverageFrom && holiday <= calendar.coverageThrough, 'CALENDAR_COVERAGE', 'Feriado fora da cobertura declarada.')
  }
}

function followingUnchecked(iso, calendar) {
  let current = stamp(iso)
  while (true) {
    const civil = isoFromStamp(current)
    requireValue(civil >= calendar.coverageFrom && civil <= calendar.coverageThrough, 'CALENDAR_COVERAGE', `Calendário não cobre ${civil}.`)
    if (!calendar.weekendDays.includes(new Date(current).getUTCDay()) && !calendar.holidays.includes(civil)) return civil
    current += DAY
  }
}
export function followingBusinessDay(iso, calendar) {
  validateCalendar(calendar)
  return followingUnchecked(iso, calendar)
}

// Item 5.3: construir para trás, desde o término da carência. Não cobra na data-base.
export function graceOffsetsBackwards(graceMonths, frequencyMonths) {
  int(graceMonths, 0, 1200, 'Carência')
  int(frequencyMonths, 1, 1200, 'Periodicidade')
  const offsets = []
  for (let value = graceMonths; value > 0; value -= frequencyMonths) offsets.unshift(value)
  return offsets
}

function roundPositiveRational(numerator, denominator) {
  const result = Number((2n * numerator + denominator) / (2n * denominator))
  money(result, 'Valor calculado')
  return result
}

function calculateInterestCents(balance, rate, period) {
  // 365 e 366 são coprimos; esta fração representa exatamente a soma por ano civil.
  const yearDenominator = 133590n
  const yearNumerator = period.segments.reduce((sum, part) => sum + BigInt(part.days) * (yearDenominator / BigInt(part.denominator)), 0n)
  if (yearNumerator % yearDenominator === 0n) {
    // Evita o erro log/exp no empate exato (ex.: 0,375 em um ano).
    const years = yearNumerator / yearDenominator
    const denominator = rate.denominator ** years
    const numerator = (rate.denominator + rate.numerator) ** years - denominator
    return roundPositiveRational(BigInt(balance) * numerator, denominator)
  }
  const rawCents = balance * Math.expm1(Math.log1p(rate.numeric) * period.fraction)
  requireValue(Number.isFinite(rawCents) && rawCents >= 0 && rawCents <= MAX_CENTS, 'INVALID_INTEGER', 'Juros calculados fora do intervalo técnico.')
  // Barreiras conservadoras, não ajuste ad hoc de centavos: se o arredondamento depende
  // de ruído binário perto de 0,5 centavo, exige avaliação decimal antes de emitir saída.
  const numericalGuard = 64 * Number.EPSILON * Math.max(1, balance, rawCents)
  requireValue(Math.abs(rawCents - Math.floor(rawCents) - 0.5) > numericalGuard, 'ROUNDING_PRECISION_AMBIGUOUS', 'Juros próximos de meio centavo exigem cálculo decimal de alta precisão; saída bloqueada.')
  return Math.round(rawCents)
}

// Não inventa datas futuras. O principal ainda não exibido pode ser tributado no teto
// somente quando a última data observada já o alcançou. Todas as seguintes são posteriores.
function computeWithheldIof(input, rows) {
  const { principalCents, releaseDate, tax } = input
  const fixed = decimal(tax.additionalRateDecimal, 'IOF adicional')
  const daily = decimal(tax.dailyRateDecimal, 'IOF diário')
  const bases = rows.filter(row => row.principalCents > 0).map(row => ({
    date: row.date,
    principalCents: row.principalCents,
    elapsedDays: civilDaysBetween(releaseDate, row.date),
    cappedDays: Math.min(tax.maxDays, civilDaysBetween(releaseDate, row.date)),
  }))
  const paidPrincipal = bases.reduce((sum, base) => sum + base.principalCents, 0)
  const tailPrincipalCents = principalCents - paidPrincipal
  if (tailPrincipalCents > 0 && daily.numerator > 0n) {
    requireValue(civilDaysBetween(releaseDate, rows.at(-1).date) >= tax.maxDays, 'IOF_INCOMPLETE_BEFORE_CAP', 'Faltam vencimentos anteriores ao teto do IOF. Não é possível inferir o imposto total.')
  }
  const weighted = bases.reduce((sum, base) => sum + BigInt(base.principalCents) * BigInt(base.cappedDays), 0n)
    + BigInt(tailPrincipalCents) * BigInt(tax.maxDays)
  const fixedNumerator = BigInt(principalCents) * fixed.numerator
  const dailyNumerator = weighted * daily.numerator
  const totalNumerator = fixedNumerator * daily.denominator + dailyNumerator * fixed.denominator
  return {
    settlement: tax.settlement,
    status: 'calculated-under-explicit-assumptions',
    additionalCents: roundPositiveRational(fixedNumerator, fixed.denominator),
    dailyCents: roundPositiveRational(dailyNumerator, daily.denominator),
    totalCents: roundPositiveRational(totalNumerator, fixed.denominator * daily.denominator),
    // Memória tributária não representa cobrança de IOF nestes vencimentos.
    calculationBases: bases,
    unshownPrincipalAtCapCents: tailPrincipalCents,
    unshownPaymentDates: null,
    rounding: 'half-up-on-total',
  }
}

function validateInput(input) {
  requireValue(input && typeof input === 'object', 'MISSING_INPUT', 'Informe os dados do cenário.')
  objectFields(input, ['productId', 'lenderProfileId', 'ruleVersion', 'mode', 'indexer', 'amortizationMethod', 'dayCount', 'intervalBoundaries', 'businessDayAdjustment', 'moneyRoundingPolicy', 'principalRoundingPolicy', 'graceSchedulePolicy', 'releaseInPaymentMonthPolicy', 'principalFrequencyMonths', 'graceInterestFrequencyMonths', 'principalCents', 'termMonths', 'graceMonths', 'releaseDate', 'nominalGraceStart', 'nominalPaymentDay', 'annualRate', 'calendar', 'horizon', 'tax', 'fees', 'reportedCet'], 'Operação')
  oneOf(input.productId, [CREDIT_PROFILE.productId], 'productId')
  oneOf(input.lenderProfileId, [CREDIT_PROFILE.lenderProfileId], 'lenderProfileId')
  oneOf(input.ruleVersion, [CREDIT_PROFILE.version], 'ruleVersion')
  oneOf(input.mode, ['partial-reconciliation'], 'mode')
  oneOf(input.indexer, ['tfb'], 'indexer')
  oneOf(input.amortizationMethod, ['sac'], 'amortizationMethod')
  oneOf(input.dayCount, [CREDIT_PROFILE.dayCount], 'dayCount')
  oneOf(input.intervalBoundaries, [CREDIT_PROFILE.intervalBoundaries], 'intervalBoundaries')
  oneOf(input.businessDayAdjustment, ['following'], 'businessDayAdjustment')
  oneOf(input.moneyRoundingPolicy, ['half-up-event-cents'], 'moneyRoundingPolicy')
  oneOf(input.principalRoundingPolicy, ['constant-cents-final-residual', 'remaining-balance-each-event'], 'principalRoundingPolicy')
  oneOf(input.graceSchedulePolicy, ['backwards-from-end'], 'graceSchedulePolicy')
  oneOf(input.releaseInPaymentMonthPolicy, ['reject-needs-contract-review'], 'releaseInPaymentMonthPolicy')
  oneOf(input.principalFrequencyMonths, [1], 'principalFrequencyMonths')
  oneOf(input.graceInterestFrequencyMonths, [1, 3, 6], 'graceInterestFrequencyMonths')
  money(input.principalCents, 'Principal', 1)
  int(input.termMonths, 1, 1200, 'Prazo')
  int(input.graceMonths, 0, input.termMonths - 1, 'Carência')
  requireValue(input.principalCents >= input.termMonths - input.graceMonths, 'PRINCIPAL_TOO_SMALL', 'Principal insuficiente para amortização positiva em centavos.')
  stamp(input.releaseDate)
  requireValue(input.nominalGraceStart, 'MISSING_ANCHOR', 'Informe âncora nominal e origem; não substitua assinatura por liberação.')
  objectFields(input.nominalGraceStart, ['date', 'source', 'status'], 'nominalGraceStart')
  stamp(input.nominalGraceStart.date)
  provenance(input.nominalGraceStart, 'Âncora da carência')
  int(input.nominalPaymentDay, 1, 31, 'Dia nominal')
  requireValue(Number(input.nominalGraceStart.date.slice(8)) === input.nominalPaymentDay, 'ANCHOR_MISMATCH', 'Âncora nominal incompatível com o dia informado.')
  requireValue(input.annualRate, 'MISSING_RATE', 'Taxa anual precisa e sua origem são obrigatórias.')
  objectFields(input.annualRate, ['decimal', 'asOf', 'source', 'status'], 'annualRate')
  decimal(input.annualRate.decimal, 'Taxa anual', 10)
  provenance(input.annualRate, 'Taxa anual')
  stamp(input.annualRate.asOf)
  validateCalendar(input.calendar)
  requireValue(input.horizon && isText(input.horizon.source), 'MISSING_HORIZON', 'Informe o horizonte documentado e a fonte.')
  objectFields(input.horizon, ['lastNominalDate', 'observedRowCount', 'source'], 'horizon')
  stamp(input.horizon.lastNominalDate)
  int(input.horizon.observedRowCount, 1, input.termMonths, 'Quantidade documentada')
  requireValue(input.horizon.lastNominalDate >= input.nominalGraceStart.date, 'INVALID_HORIZON', 'Horizonte anterior à âncora.')
  requireValue(input.tax, 'MISSING_TAX', 'Tributação explícita obrigatória; não há alíquota padrão.')
  objectFields(input.tax, ['additionalRateDecimal', 'dailyRateDecimal', 'maxDays', 'settlement', 'rounding', 'source', 'status'], 'tax')
  oneOf(input.tax.settlement, ['withheld-at-release'], 'tax.settlement')
  oneOf(input.tax.rounding, ['half-up-on-total'], 'tax.rounding')
  provenance(input.tax, 'IOF')
  decimal(input.tax.additionalRateDecimal, 'IOF adicional')
  decimal(input.tax.dailyRateDecimal, 'IOF diário')
  int(input.tax.maxDays, 1, 3660, 'Teto de dias do IOF')
  requireValue(Array.isArray(input.fees), 'MISSING_FEES', 'Informe as tarifas, inclusive lista vazia quando não houver.')
  for (const fee of input.fees) {
    objectFields(fee, ['amountCents', 'settlement', 'source', 'status'], 'fee')
    money(fee.amountCents, 'Tarifa')
    oneOf(fee.settlement, ['first-payment'], 'fee.settlement')
    provenance(fee, 'Tarifa')
  }
  if (input.reportedCet !== undefined && input.reportedCet !== null) {
    objectFields(input.reportedCet, ['annualRateDecimal', 'source', 'status'], 'reportedCet')
    decimal(input.reportedCet.annualRateDecimal, 'CET informado', 10)
    provenance(input.reportedCet, 'CET informado')
  }
}

/**
 * Retorna somente o horizonte documental e fluxos correspondentes, nunca o fluxo completo
 * por extrapolação. `ok` significa cálculo executado, não validação contratual.
 * Não recebe cotação ao vivo nem depende de timezone, Date.now, rede ou Finame.
 */
export function reconcileCreditoPequenasEmpresas(input) {
  try {
    validateInput(input)
    const annualRate = decimal(input.annualRate.decimal, 'Taxa anual', 10)
    const countPrincipal = input.termMonths - input.graceMonths
    const constantPrincipal = Math.round(input.principalCents / countPrincipal)
    requireValue(input.principalRoundingPolicy !== 'constant-cents-final-residual' || input.principalCents - (countPrincipal - 1) * constantPrincipal > 0, 'INVALID_FINAL_RESIDUAL', 'Arredondamento do SAC deixaria residual final não positivo.')
    const nominalEvents = graceOffsetsBackwards(input.graceMonths, input.graceInterestFrequencyMonths)
      .map(offset => ({ offset, inGrace: true }))
    for (let offset = input.graceMonths + 1; offset <= input.termMonths; offset++) nominalEvents.push({ offset, inGrace: false })
    const anchor = input.nominalGraceStart.date, end = input.horizon.lastNominalDate
    const horizonOffset = (Number(end.slice(0, 4)) - Number(anchor.slice(0, 4))) * 12 + Number(end.slice(5, 7)) - Number(anchor.slice(5, 7))
    // Os offsets restantes são contagens, não datas/parcela projetadas.
    const documented = nominalEvents.filter(event => event.offset <= horizonOffset)
      .map(event => ({ ...event, nominalDate: addCivilMonths(anchor, event.offset, input.nominalPaymentDay) }))
    requireValue(documented.length === input.horizon.observedRowCount && documented.at(-1)?.nominalDate === input.horizon.lastNominalDate, 'HORIZON_MISMATCH', 'Horizonte e quantidade de eventos documentados não coincidem.')
    const rows = []
    let balance = input.principalCents, priorDate = input.releaseDate, principalNumber = 0
    for (const event of documented) {
      const date = followingUnchecked(event.nominalDate, input.calendar)
      // Item 5.6 exige regra própria para liberação no mês de cobrança. Este protótipo
      // bloqueia em vez de implementar uma interpretação não validada dessa exceção.
      requireValue(event.nominalDate.slice(0, 7) !== input.releaseDate.slice(0, 7) && date.slice(0, 7) !== input.releaseDate.slice(0, 7), 'RELEASE_IN_PAYMENT_MONTH', 'Liberação no mês de cobrança: revisar aplicação do item 5.6 antes de calcular.')
      requireValue(date > priorDate, 'DATE_ORDER', 'Pagamento deve ser posterior à liberação e ao pagamento anterior.')
      const period = actualActualCalendarYears(priorDate, date)
      const interestCents = calculateInterestCents(balance, annualRate, period)
      money(interestCents, 'Juros calculados')
      if (!event.inGrace) principalNumber++
      const principalCents = event.inGrace ? 0 : input.principalRoundingPolicy === 'remaining-balance-each-event'
        ? roundPositiveRational(BigInt(balance), BigInt(countPrincipal - principalNumber + 1))
        : principalNumber === countPrincipal ? balance : constantPrincipal
      requireValue(principalCents <= balance, 'NEGATIVE_BALANCE', 'Arredondamento incompatível com o saldo residual.')
      const paymentCents = interestCents + principalCents
      money(paymentCents, 'Prestação calculada')
      rows.push({ number: rows.length + 1, nominalDate: event.nominalDate, date, openingCents: balance, interestCents, principalCents, paymentCents, closingCents: balance - principalCents, inGrace: event.inGrace, periodStart: priorDate, days: period.days, yearSegments: period.segments })
      balance -= principalCents
      priorDate = date
    }
    const iof = computeWithheldIof(input, rows)
    requireValue(iof.totalCents < input.principalCents, 'NON_POSITIVE_DISBURSEMENT', 'IOF deixa crédito líquido não positivo.')
    const feesCents = input.fees.reduce((sum, fee) => sum + fee.amountCents, 0)
    money(feesCents, 'Total de tarifas')
    money(rows[0].paymentCents + feesCents, 'Primeira saída de caixa')
    const cashFlows = [
      { kind: 'release', date: input.releaseDate, creditCents: input.principalCents, principalCents: 0, interestCents: 0, iofPaidCents: iof.totalCents, feeCents: 0, cashOutCents: 0, netCashCents: input.principalCents - iof.totalCents },
      ...rows.map((row, index) => ({ kind: 'payment', date: row.date, creditCents: 0, principalCents: row.principalCents, interestCents: row.interestCents, iofPaidCents: 0, feeCents: index === 0 ? feesCents : 0, cashOutCents: row.paymentCents + (index === 0 ? feesCents : 0), netCashCents: -row.paymentCents - (index === 0 ? feesCents : 0) })),
    ]
    const warnings = [
      'Estimativa não validada contratualmente. Reconciliação limitada ao horizonte documentado.',
      'Nenhuma regra deste perfil deve ser transferida automaticamente para Finame/TFC.',
      'CET não calculado nem validado. Mesmo com todos os eventos visíveis, despesas, precisão e convenção regulatória precisam de confirmação.',
      'Aplicabilidade das alíquotas e da base de IOF precisa de confirmação fiscal para a operação.',
      'Liberação no mês de cobrança (item 5.6), múltiplas liberações e IOF financiado não são suportados.',
      'Expoentes fracionários usam aritmética binária com bloqueio próximo de meio centavo; a reprodução não certifica arredondamento contratual em todos os casos.',
    ]
    if (input.annualRate.status === 'inferred') warnings.push('A taxa precisa foi inferida do cenário, não fornecida com a precisão original das células. Não confundir com taxa oficial ou cotação atual.')
    if (input.nominalGraceStart.status === 'inferred') warnings.push('Âncora de carência inferida; assinatura não foi substituída pela data de liberação.')
    if (input.calendar.completeness === 'partial') warnings.push('Calendário parcial informado: as datas calculadas são hipóteses dentro da cobertura, não calendário bancário validado.')
    return {
      ok: true,
      validationStatus: 'estimate-not-contract-validated',
      numericalPolicy: 'exact-rational-integer-years-otherwise-binary-with-half-cent-guard',
      productId: input.productId,
      principalRoundingPolicy: input.principalRoundingPolicy,
      profile: CREDIT_PROFILE,
      annualRate: { ...input.annualRate },
      calendar: { id: input.calendar.id, version: input.calendar.version, completeness: input.calendar.completeness, source: input.calendar.source },
      horizon: { ...input.horizon, completeContractFlow: false, unshownEventCount: nominalEvents.length - rows.length },
      paymentEventCoverage: { covered: rows.length, expected: nominalEvents.length, allExpectedEventsCovered: rows.length === nominalEvents.length },
      rows,
      iof,
      cashFlows,
      cashFlowComplete: false,
      netDisbursementCents: input.principalCents - iof.totalCents,
      firstInterestPayment: rows.find(row => row.interestCents > 0) ?? null,
      firstPrincipalPayment: rows.find(row => row.principalCents > 0) ?? null,
      firstCashOutCents: cashFlows[1].cashOutCents,
      totalContractCostCents: null,
      finalPayment: null,
      cet: { reportedAnnualRateDecimal: input.reportedCet?.annualRateDecimal ?? null, calculatedAnnualRateDecimal: null, validated: false, status: rows.length === nominalEvents.length ? 'not-validated-scenario-formula-unconfirmed' : 'not-validated-incomplete-evidence' },
      warnings,
    }
  } catch (error) {
    if (!(error instanceof InputError)) throw error
    return { ok: false, validationStatus: 'blocked', errors: [{ code: error.code, message: error.message }], rows: [], cashFlows: [], cet: { calculatedAnnualRateDecimal: null, validated: false } }
  }
}
