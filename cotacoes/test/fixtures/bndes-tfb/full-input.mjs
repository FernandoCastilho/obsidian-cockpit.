import { exampleInput } from '../credito-pequenas-empresas.mjs'
import { CREDIT_PROFILE } from '../../../src/bndesCreditoPequenasEmpresas.js'
import { observedNonBusinessDates } from './full-evidence.mjs'

export function fullInput() {
  const input = exampleInput()
  input.ruleVersion = CREDIT_PROFILE.version
  input.lenderProfileId = CREDIT_PROFILE.lenderProfileId
  input.annualRate.source = 'Taxa candidata que reproduz as 34 linhas do cenário montado pelo usuário; precisão original das células não confirmada. Data da análise, não data-base presumida da cotação.'
  input.principalRoundingPolicy = 'remaining-balance-each-event'
  input.calendar.coverageThrough = '2029-11-30'
  input.calendar.holidays = [...observedNonBusinessDates]
  input.calendar.source = 'Dias não úteis observados nos deslocamentos das 34 linhas. Não representa calendário bancário integral.'
  input.nominalGraceStart.source = 'Âncora inferida das datas do cenário montado pelo usuário; regra original de geração ainda não fornecida.'
  input.horizon = { lastNominalDate: '2029-11-15', observedRowCount: 34, source: 'Três fotos completas entregues em 05/11/2026, com todos os 34 pagamentos e total impresso.' }
  // Instrução de 06/11/2026: apurar o CET pelas parcelas e pelos encargos,
  // desconsiderando o CET do cabeçalho como referência de aceitação.
  input.reportedCet = null
  return input
}
