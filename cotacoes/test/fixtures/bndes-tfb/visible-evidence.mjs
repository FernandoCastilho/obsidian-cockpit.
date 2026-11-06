// Transcrição independente das fotos fornecidas. Não é código do produto.
// A precisão de taxa abaixo é inferida; não consta assim no cabeçalho fotografado.
export const evidence = Object.freeze({
  product: 'BNDES Crédito Pequenas Empresas',
  financialCost: 'TFB',
  release: '2026-10-26',
  principalCents: 300000000,
  termMonths: 36,
  graceMonths: 3,
  costAnnualPercentDisplayed: '13.70',
  bndesAnnualPercentDisplayed: '1.35',
  agentAnnualPercentDisplayed: '2.00',
  totalAnnualPercentDisplayed: '17.54',
  totalMonthlyPercentDisplayed: '1.36',
  iofCents: 9418273,
  feeCents: 220000,
  cetAnnualPercentDisplayed: '20.01',
  cetMonthlyPercentDisplayed: '1.51',
  inferredAnnualRate: 0.175402,
  inferredNominalGraceStart: '2026-11-15',
  firstInterestPayment: '2027-02-15',
  firstPrincipalPayment: '2027-03-15',
  caveats: [
    'Só as linhas 1 a 13 estão legíveis; o PDF tem três páginas.',
    'Taxa 17,5402% é hipótese reproduzível, não precisão confirmada do contrato.',
    'Data de assinatura e início nominal da carência não foram apresentados como campos explícitos.',
    'IOF é descontado na liberação; tarifa é cobrada no primeiro pagamento e não integra a tabela.',
  ],
});

// Valores monetários em centavos: número, data, saldo antes, juros, principal, prestação.
export const visibleRows = Object.freeze([
  [1, '2027-02-15', 300000000, 15252044,        0, 15252044],
  [2, '2027-03-15', 300000000,  3742399,  9090909, 12833308],
  [3, '2027-04-15', 290909091,  4020489,  9090909, 13111398],
  [4, '2027-05-17', 281818182,  4021381,  9090909, 13112290],
  [5, '2027-06-15', 272727273,  3524469,  9090909, 12615378],
  [6, '2027-07-15', 263636364,  3525251,  9090909, 12616160],
  [7, '2027-08-16', 254545455,  3632215,  9090909, 12723124],
  [8, '2027-09-15', 245454546,  3282131,  9090909, 12373040],
  [9, '2027-10-15', 236363637,  3160570,  9090909, 12251479],
  [10,'2027-11-16', 227272728,  3243049,  9090909, 12333958],
  [11,'2027-12-15', 218181819,  2819575,  9090909, 11910484],
  [12,'2028-01-17', 209090910,  3073163,  9090909, 12164072],
  [13,'2028-02-15', 200000001,  2577504,  9090909, 11668413],
].map(([number, date, openingCents, interestCents, principalCents, paymentCents]) =>
  Object.freeze({number, date, openingCents, interestCents, principalCents, paymentCents})));
