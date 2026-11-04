// BNDES Finame Materiais (Materiais Industrializados): regras do produto e a conta da operação indireta.
// Regras conforme a página do produto e as circulares do BNDES vigentes em novembro de 2026; o agente financeiro confirma as condições
// de cada operação. A tela mostra a data da regra e avisa o que precisa de conferência.
import { monthlyRate } from './emprestimo.js'

export const REGRAS = {
  conferidoEm: '2026-11-04',
  prazoMaxMeses: 84, // até 7 anos
  carenciaMaxMeses: 24, // até 2 anos
  carenciaMaxTfbMeses: 12, // com TFB ou taxa fixa composta, carência de até 1 ano
  participacaoMaxPct: 100,
  tetoOperacao: 20_000_000, // por operação
  tetoCliente12m: 150_000_000, // por cliente a cada 12 meses, da homologação
  taxaBndes: { 'mpme-nne': 0.95, demais: 1.25 }, // % a.a.; 1,25% vale desde 22/01/2026 (antes, 1,15%)
  selicSuspensa: 'Circular nº 09/2026, de 22/01/2026',
  reembolsoMeses: 12, // notas fiscais emitidas até 12 meses antes do protocolo
  itens: 'bens industrializados novos, de fabricação nacional e credenciados no BNDES (cerca de 2.500 itens por NCM), usados na atividade do cliente',
  foraDoProduto: 'alimentos, bebidas, combustíveis, lubrificantes e máquinas ou equipamentos credenciáveis no CFI (esses vão para o Finame tradicional)',
  nacionalizacao: 'conteúdo importado de até 40% ou cumprimento do Processo Produtivo Básico (PPB), conforme o credenciamento',
  iof: 'alíquota zero nas operações com recursos do BNDES (Decreto 6.306/2007, art. 8º); o agente confirma',
}
export const PORTES = [
  { id: 'mpme-nne', label: 'MPME no Norte ou Nordeste', taxa: REGRAS.taxaBndes['mpme-nne'] },
  { id: 'demais', label: 'MPME nas demais regiões ou grande empresa', taxa: REGRAS.taxaBndes.demais },
]
export const CUSTOS = [
  { id: 'tfb', label: 'TFB (prefixada)', hint: 'Taxa Fixa do BNDES, cotada na contratação, por faixa de prazo e prazo de liberação (30 ou 90 dias).' },
  { id: 'tlp', label: 'TLP + IPCA', hint: 'TLP é a parcela prefixada em termos reais; o saldo é corrigido pelo IPCA. A conta usa o IPCA esperado (Focus) como projeção.' },
]
export const PERIODICIDADES = [
  { id: 1, label: 'Mensal' },
  { id: 3, label: 'Trimestral' },
  { id: 6, label: 'Semestral' },
]
export const SISTEMAS = [
  { id: 'sac', label: 'SAC', hint: 'amortização constante, parcelas decrescentes (padrão do Finame)' },
  { id: 'price', label: 'Price', hint: 'parcelas iguais' },
]

// Faixa da TFB pelo prazo total da operação (a tabela do BNDES é por faixa: até 36, 36 a 60, 60 a 84, 84 a 120 meses).
export const faixaTfb = (prazoMeses) => (prazoMeses <= 36 ? 36 : prazoMeses <= 60 ? 60 : prazoMeses <= 84 ? 84 : 120)

// Taxa final da operação indireta: custo financeiro, taxa do BNDES e taxa do agente, compostas (todas em % a.a.).
export const taxaFinal = (custo, bndes, agente) => ((1 + custo / 100) * (1 + bndes / 100) * (1 + agente / 100) - 1) * 100

// Custo financeiro nominal da TLP: parcela prefixada (TLP) composta com o IPCA projetado.
export const tlpNominal = (tlp, ipca) => ((1 + tlp / 100) * (1 + ipca / 100) - 1) * 100

// Conferência das regras do produto. Devolve { erros: [...], avisos: [...] }: erro impede a conta; aviso só alerta.
export function conferir({ valor, participacao, prazo, carencia, custo }) {
  const erros = [], avisos = []
  if (!(valor > 0)) erros.push('Informe o valor dos materiais.')
  if (!(participacao > 0 && participacao <= REGRAS.participacaoMaxPct)) erros.push(`A participação do BNDES vai de 1% a ${REGRAS.participacaoMaxPct}% dos itens financiáveis.`)
  if (!Number.isInteger(prazo) || prazo < 1) erros.push('Informe o prazo total em meses.')
  else if (prazo > REGRAS.prazoMaxMeses) erros.push(`Prazo total acima do máximo do produto: ${REGRAS.prazoMaxMeses} meses (7 anos).`)
  if (!Number.isInteger(carencia) || carencia < 0) erros.push('Informe a carência em meses (0 se não houver).')
  else {
    const max = custo === 'tfb' ? REGRAS.carenciaMaxTfbMeses : REGRAS.carenciaMaxMeses
    if (carencia > max) erros.push(`Carência acima do máximo: ${max} meses${custo === 'tfb' ? ' com TFB (1 ano)' : ' (2 anos)'}.`)
    if (Number.isInteger(prazo) && prazo >= 1 && carencia >= prazo) erros.push('A carência precisa ser menor que o prazo total.')
  }
  const financiado = valor > 0 && participacao > 0 ? (valor * participacao) / 100 : 0
  if (financiado > REGRAS.tetoOperacao) avisos.push(`Valor financiado acima do teto por operação (R$ 20 milhões); a operação precisa ser dividida ou ajustada.`)
  if (financiado > REGRAS.tetoCliente12m) avisos.push(`Valor acima do limite por cliente em 12 meses (R$ 150 milhões).`)
  return { erros, avisos, financiado }
}

// Cronograma: carência com juros pagos na periodicidade escolhida (sobre o saldo, capitalizados mês a mês) e depois SAC ou Price
// mensal com juros junto do principal. taxaAnual em % a.a. Devolve parcelas [{ mes, juros, amortizacao, parcela, saldo }].
export function cronograma({ financiado, prazo, carencia, taxaAnual, sistema, periodicidade = 1 }) {
  const i = monthlyRate(taxaAnual, 'aa')
  const parcelas = []
  let saldo = financiado
  let acumulado = 0
  for (let m = 1; m <= carencia; m++) {
    acumulado = (saldo + acumulado) * i + acumulado // juros do mês sobre saldo + juros ainda não pagos (capitalização dentro do período)
    const paga = m % periodicidade === 0 || m === carencia
    parcelas.push({ mes: m, juros: paga ? acumulado : 0, amortizacao: 0, parcela: paga ? acumulado : 0, saldo, carencia: true })
    if (paga) acumulado = 0
  }
  const n = prazo - carencia
  const amortConst = financiado / n
  const pmt = i === 0 ? financiado / n : (financiado * i) / (1 - (1 + i) ** -n)
  for (let k = 1; k <= n; k++) {
    const juros = saldo * i
    const amortizacao = sistema === 'price' ? pmt - juros : amortConst
    saldo = Math.max(0, saldo - amortizacao)
    parcelas.push({ mes: carencia + k, juros, amortizacao, parcela: juros + amortizacao, saldo, carencia: false })
  }
  return parcelas
}

// Resumo da operação: taxa final, parcelas e totais. Entradas em % a.a. e R$.
export function simular({ valor, participacao = 100, prazo, carencia = 0, custo, custoFinanceiro, taxaBndes, taxaAgente, sistema = 'sac', periodicidade = 1, iofPct = 0 }) {
  const check = conferir({ valor, participacao, prazo, carencia, custo })
  if (check.erros.length || ![custoFinanceiro, taxaBndes, taxaAgente].every((v) => Number.isFinite(v) && v >= 0 && v <= 100)) return { ok: false, ...check }
  const financiado = check.financiado
  const taxa = taxaFinal(custoFinanceiro, taxaBndes, taxaAgente)
  const parcelas = cronograma({ financiado, prazo, carencia, taxaAnual: taxa, sistema, periodicidade })
  const jurosCarencia = parcelas.filter((p) => p.carencia).reduce((a, p) => a + p.juros, 0)
  const juros = parcelas.reduce((a, p) => a + p.juros, 0)
  const amort = parcelas.filter((p) => !p.carencia)
  const iof = (financiado * iofPct) / 100
  return {
    ok: true, financiado, taxa, taxaMensal: monthlyRate(taxa, 'aa') * 100, parcelas, jurosCarencia, juros, iof,
    primeiraParcela: amort[0]?.parcela ?? 0, ultimaParcela: amort.at(-1)?.parcela ?? 0, parcelasAmortizacao: amort.length,
    total: financiado + juros + iof, recursosProprios: valor - financiado, avisos: check.avisos,
  }
}

// Equivalente em CDI + spread: o spread que, somado ao CDI atual, dá a mesma taxa final (para comparar com o giro).
export const spreadSobreCdi = (taxa, cdi) => (Number.isFinite(cdi) ? ((1 + taxa / 100) / (1 + cdi / 100) - 1) * 100 : null)
