// Caso histórico transcrito das três imagens fornecidas pelo usuário em 05/11/2026.
// Não contém dados identificadores. Não são taxas atuais ou condições padrão.
// Mantido separado do oráculo de teste para conferir a integração sem circularidade.
const INPUT = {
  "productId": "bndes-credito-pequenas-empresas",
  "lenderProfileId": "cenario-usuario-tfb-2026-10",
  "ruleVersion": "0.2.2-research",
  "mode": "partial-reconciliation",
  "indexer": "tfb",
  "principalCents": 300000000,
  "releaseDate": "2026-10-26",
  "nominalGraceStart": {
    "date": "2026-11-15",
    "status": "inferred",
    "source": "Âncora inferida das datas do cenário montado pelo usuário; regra original de geração ainda não fornecida."
  },
  "termMonths": 36,
  "graceMonths": 3,
  "principalFrequencyMonths": 1,
  "graceInterestFrequencyMonths": 3,
  "nominalPaymentDay": 15,
  "annualRate": {
    "decimal": "0.175402",
    "asOf": "2026-11-05",
    "status": "inferred",
    "source": "Taxa candidata que reproduz as 34 linhas do cenário montado pelo usuário; precisão original das células não confirmada. Data da análise, não data-base presumida da cotação."
  },
  "dayCount": "actual-actual-calendar-year",
  "intervalBoundaries": "exclude-start-include-end",
  "businessDayAdjustment": "following",
  "graceSchedulePolicy": "backwards-from-end",
  "releaseInPaymentMonthPolicy": "reject-needs-contract-review",
  "amortizationMethod": "sac",
  "moneyRoundingPolicy": "half-up-event-cents",
  "principalRoundingPolicy": "remaining-balance-each-event",
  "calendar": {
    "id": "observed-dates-only",
    "version": "2026-11-05",
    "completeness": "partial",
    "coverageFrom": "2027-02-01",
    "coverageThrough": "2029-11-30",
    "weekendDays": [
      0,
      6
    ],
    "holidays": [
      "2027-11-15",
      "2028-06-15",
      "2028-11-15",
      "2029-11-15"
    ],
    "source": "Dias não úteis observados nos deslocamentos das 34 linhas. Não representa calendário bancário integral."
  },
  "horizon": {
    "lastNominalDate": "2029-11-15",
    "observedRowCount": 34,
    "source": "Três fotos completas entregues em 05/11/2026, com todos os 34 pagamentos e total impresso."
  },
  "tax": {
    "additionalRateDecimal": "0.0038",
    "dailyRateDecimal": "0.000082",
    "maxDays": 365,
    "settlement": "withheld-at-release",
    "rounding": "half-up-on-total",
    "status": "inferred",
    "source": "Hipótese que reproduz IOF R$ 94.182,73 da foto. Retenção na liberação observada em nota; aplicação fiscal não validada."
  },
  "fees": [
    {
      "amountCents": 220000,
      "settlement": "first-payment",
      "status": "observed",
      "source": "Tarifa e nota da primeira cobrança na foto."
    }
  ],
  "reportedCet": null
}

export const createTfbReference = () => structuredClone(INPUT)
