// Calculadoras disponíveis (usadas na aba Calculadoras e nos atalhos do Resumo). O id vira endereço: #calculadora/<id>.
export const CALC_OPTIONS = [
  { id: 'finimp', icon: ['M3 7h18v10H3z','M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z','M6 10v4M18 10v4'], chip: 'US$', title: 'FINIMP 4131', desc: 'Juros e cronograma em moeda estrangeira.', help: 'finimp' },
  { id: 'finimpswap', icon: ['M4 8h13l-3-3','M20 16H7l3 3'], chip: 'US$⇄', title: 'FINIMP + swap CDI', desc: 'Cotação do banco: perna em USD e perna em R$.', help: 'finimpswap' },
  { id: 'giro', icon: ['M3 12a9 9 0 0115.5-6.2L21 8','M21 3v5h-5','M21 12a9 9 0 01-15.5 6.2L3 16','M3 21v-5h5'], chip: 'R$', title: 'Capital de giro', desc: 'Parcelas e custo efetivo em R$.', help: 'giro' },
  { id: 'comparar', icon: ['M12 3v18','M5 7h14','M5 7l-3 6a3 3 0 006 0z','M19 7l-3 6a3 3 0 006 0z'], chip: '⇄', title: 'Comparar operações', desc: 'Empréstimo × aplicação no CDI.', help: 'calculadora' },
  { id: 'aplicacao', icon: ['M3 17l6-6 4 4 8-8','M15 7h6v6','M3 21h18'], chip: '%', title: 'Aplicação financeira', desc: 'CDB, LCI/LCA, líquido de IR.', help: 'aplicacao' },
]
