// Entradas explícitas da pesquisa, não defaults do produto. Sem dados identificadores do cliente.
import { CREDIT_PROFILE } from '../../src/bndesCreditoPequenasEmpresas.js'

export function exampleInput() {
  return {
    productId: 'bndes-credito-pequenas-empresas',
    lenderProfileId: CREDIT_PROFILE.lenderProfileId,
    ruleVersion: CREDIT_PROFILE.version,
    mode: 'partial-reconciliation',
    indexer: 'tfb',
    principalCents: 300000000,
    releaseDate: '2026-10-26',
    nominalGraceStart: { date: '2026-11-15', status: 'inferred', source: 'Primeira cobrança 15/02/2027 e carência de três meses; assinatura não disponível.' },
    termMonths: 36,
    graceMonths: 3,
    principalFrequencyMonths: 1,
    graceInterestFrequencyMonths: 3,
    nominalPaymentDay: 15,
    annualRate: { decimal: '0.175402', asOf: '2026-11-05', status: 'inferred', source: 'Data da análise, não data-base de cotação. Taxa candidata que reproduz os centavos das 13 linhas, não precisão publicada no cabeçalho.' },
    dayCount: 'actual-actual-calendar-year',
    intervalBoundaries: 'exclude-start-include-end',
    businessDayAdjustment: 'following',
    graceSchedulePolicy: 'backwards-from-end',
    releaseInPaymentMonthPolicy: 'reject-needs-contract-review',
    amortizationMethod: 'sac',
    moneyRoundingPolicy: 'half-up-event-cents',
    principalRoundingPolicy: 'constant-cents-final-residual',
    calendar: {
      id: 'observed-dates-only', version: '2026-11-05', completeness: 'partial',
      coverageFrom: '2027-02-01', coverageThrough: '2028-02-29',
      weekendDays: [0, 6], holidays: ['2027-11-15'],
      source: 'Somente hipótese suficiente para as datas visíveis na foto; não é calendário bancário completo.',
    },
    horizon: { lastNominalDate: '2028-02-15', observedRowCount: 13, source: 'Foto: linhas 1–13 legíveis; restante do PDF ausente.' },
    tax: {
      additionalRateDecimal: '0.0038', dailyRateDecimal: '0.000082', maxDays: 365,
      settlement: 'withheld-at-release', rounding: 'half-up-on-total', status: 'inferred',
      source: 'Hipótese que reproduz IOF R$ 94.182,73 da foto. Retenção na liberação observada em nota; aplicação fiscal não validada.',
    },
    fees: [{ amountCents: 220000, settlement: 'first-payment', status: 'observed', source: 'Tarifa e nota da primeira cobrança na foto.' }],
    reportedCet: { annualRateDecimal: '0.2001', status: 'observed', source: 'Cabeçalho da foto. Não reconciliado com fluxo integral.' },
  }
}
