// BNDES Finame Materiais (Materiais Industrializados): regras do produto, base legal e a conta da operação indireta.
// Regras conforme a página do produto e as circulares do BNDES vigentes em novembro de 2026 (ver FONTES); o agente financeiro
// confirma as condições de cada operação. A tela mostra a data da regra e avisa o que precisa de conferência.
import { IOF_PJ, monthlyRate } from './emprestimo.js'

export const REGRAS = {
  conferidoEm: '2026-11-04',
  prazoMaxMeses: 84, // até 7 anos
  carenciaMaxMeses: 24, // até 2 anos
  carenciaMaxTfbMeses: 12, // com TFB ou taxa fixa composta, carência de até 1 ano
  participacaoMinPct: 1,
  participacaoMaxPct: 100,
  tetoOperacao: 20_000_000, // por operação
  tetoCliente12m: 150_000_000, // por cliente a cada 12 meses, da homologação
  taxaBndes: { 'mpme-nne': 0.95, demais: 1.25 }, // % a.a.; 1,25% vale desde 22/01/2026 (antes, 1,15%)
  selicSuspensa: 'Circular SUP/ADIG nº 09/2026, de 22/01/2026 (altera a Circular SUP/ADIG nº 13/2022)',
  reembolsoMeses: 12, // notas fiscais emitidas até 12 meses antes do protocolo
  itens: 'bens industrializados novos, de fabricação nacional e credenciados no BNDES (cerca de 2.500 itens por NCM), usados na atividade do cliente',
  foraDoProduto: 'alimentos, bebidas, combustíveis, lubrificantes e máquinas ou equipamentos credenciáveis no CFI (esses vão para o Finame tradicional)',
  nacionalizacao: 'conteúdo importado de até 40% ou cumprimento do Processo Produtivo Básico (PPB), conforme o credenciamento',
  // IOF: a alíquota zero que valia para operações do BNDES (Decreto 6.306/2007, art. 8º, XXX) foi revogada pelo Decreto 8.511/2015;
  // a operação indireta paga o IOF de crédito de pessoa jurídica (Decreto 12.499/2025: 0,38% adicional + 0,0082% ao dia, até 365 dias).
  // Hipóteses de alíquota zero que restam (ex.: art. 8º, XV, recursos de fundos ou programas governamentais) dependem do funding e são controversas.
  iof: 'IOF de crédito de pessoa jurídica: 0,38% sobre o valor, uma vez, mais 0,0082% ao dia sobre o principal de cada parcela, até 365 dias (Decreto 12.499/2025). A alíquota zero das operações do BNDES (Decreto 6.306/2007, art. 8º, XXX) foi revogada pelo Decreto 8.511/2015; só hipóteses específicas (ex.: recursos de fundos ou programas governamentais, art. 8º, XV) seguem com zero, e o agente confirma',
}
// Base legal e fontes de cada regra (o que foi confirmado e como). "indexada": trecho da página oficial lido pelo buscador; a página em si não abriu nesta rede.
export const FONTES = [
  { regra: 'Prazo de até 84 meses; carência de até 24 (12 com TFB ou taxa fixa composta); participação até 100%; teto de R$ 150 milhões por cliente em 12 meses', fonte: 'Página do produto BNDES Finame Materiais Industrializados (indexada em 04/11/2026)', url: 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/finame-materiais-industrializados' },
  { regra: 'Teto de R$ 20 milhões por operação; notas de até 12 meses antes do protocolo; itens, exclusões e nacionalização', fonte: 'Observatório da Indústria RS, Fomento Paraná, Banestes e e-book CNI 2025 (secundárias)', url: 'https://observatoriodaindustriars.org.br/solucao/bndes-finame-materiais/' },
  { regra: 'Taxa do BNDES de 0,95% a.a. (MPME N/NE) ou 1,25% a.a. (demais), composta com o custo financeiro e a taxa do agente, negociada', fonte: 'Página do produto (indexada) e comunicado Abimaq sobre a mudança de 1,15% para 1,25% em 22/01/2026', url: 'https://informaq.abimaq.org.br/bndes-anuncia-mudancas-nas-condicoes-do-finame-materiais/' },
  { regra: 'Selic suspensa como custo financeiro, por tempo indeterminado', fonte: 'Aviso nas páginas de produto do BNDES: Circular SUP/ADIG nº 09/2026, de 22/01/2026, que altera a Circular SUP/ADIG nº 13/2022', url: 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/guia/custos-financeiros' },
  { regra: 'TLP: parcela prefixada (taxa real) mais IPCA; TFB: taxa prefixada do BNDES por faixa de prazo e prazo de liberação', fonte: 'Lei 13.483/2017 e Resolução CMN 4.600/2017 (TLP); guia de custos financeiros do BNDES (TFB)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13483.htm' },
  { regra: 'IOF de crédito PJ (0,38% + 0,0082% ao dia); revogação da alíquota zero do BNDES', fonte: 'Decreto 6.306/2007, art. 8º (inciso XXX revogado pelo Decreto 8.511/2015); Decreto 12.499/2025', url: 'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/decreto/d6306.htm' },
]
export const PORTES = [
  { id: 'mpme-nne', label: 'MPME no Norte ou Nordeste', taxa: REGRAS.taxaBndes['mpme-nne'] },
  { id: 'demais', label: 'MPME nas demais regiões ou grande empresa', taxa: REGRAS.taxaBndes.demais },
]
export const CUSTOS = [
  { id: 'tfb', label: 'TFB (prefixada)', hint: 'Taxa Fixa do BNDES, cotada na contratação, por faixa de prazo e prazo de liberação (30 ou 90 dias).' },
  { id: 'tlp', label: 'TLP + IPCA', hint: 'TLP é a parcela prefixada em termos reais (Lei 13.483/2017); o saldo é corrigido pelo IPCA. A conta usa o IPCA esperado (Focus) como projeção.' },
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
// Composição das três parcelas da taxa: capitalizada ((1+a)(1+b)(1+c)−1, como o BNDES apura juros, dia a dia) ou somada (a+b+c, como as
// páginas resumem e alguns agentes apresentam na proposta). A diferença fica em torno de 0,7 p.p. nas taxas de hoje.
export const COMPOSICOES = [
  { id: 'capitalizada', label: 'Capitalizada', hint: 'padrão do BNDES: (1 + custo) × (1 + BNDES) × (1 + agente) − 1' },
  { id: 'somada', label: 'Somada', hint: 'custo + BNDES + agente, como aparece em propostas simplificadas' },
]

// Faixa da TFB pelo prazo total da operação (a tabela do BNDES é por faixa: até 36, 36 a 60, 60 a 84, 84 a 120 meses).
export const faixaTfb = (prazoMeses) => (prazoMeses <= 36 ? 36 : prazoMeses <= 60 ? 60 : prazoMeses <= 84 ? 84 : 120)

// Taxa final da operação indireta (todas em % a.a.).
export const taxaFinal = (custo, bndes, agente, composicao = 'capitalizada') => (composicao === 'somada' ? custo + bndes + agente : ((1 + custo / 100) * (1 + bndes / 100) * (1 + agente / 100) - 1) * 100)

// Custo financeiro nominal da TLP: parcela prefixada (TLP) composta com o IPCA projetado.
export const tlpNominal = (tlp, ipca) => ((1 + tlp / 100) * (1 + ipca / 100) - 1) * 100

// Conferência das regras do produto. Devolve { erros: [...], avisos: [...] }: erro impede a conta; aviso só alerta.
export function conferir({ valor, participacao, prazo, carencia, custo }) {
  const erros = [], avisos = []
  if (!(valor > 0)) erros.push('Informe o valor dos materiais.')
  if (!(participacao >= REGRAS.participacaoMinPct && participacao <= REGRAS.participacaoMaxPct)) erros.push(`A participação do BNDES vai de ${REGRAS.participacaoMinPct}% a ${REGRAS.participacaoMaxPct}% dos itens financiáveis.`)
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

// Cronograma: carência com juros pagos na periodicidade escolhida (sobre o saldo, capitalizados mês a mês dentro do período) e depois
// SAC ou Price mensal com juros junto do principal. taxaAnual em % a.a. é a taxa de juros; ipcaAnual (% a.a., só na TLP) é a correção
// monetária capitalizada ao saldo todo mês, como no contrato do BNDES: a amortização é calculada sobre o saldo corrigido
// (SAC = saldo corrigido ÷ parcelas vincendas; Price = prestação recalculada sobre o saldo corrigido). Com ipcaAnual 0, é o SAC/Price nominal.
// Devolve parcelas [{ mes, correcao, juros, amortizacao, parcela, saldo, carencia }].
export function cronograma({ financiado, prazo, carencia, taxaAnual, sistema, periodicidade = 1, ipcaAnual = 0 }) {
  const i = monthlyRate(taxaAnual, 'aa'), c = monthlyRate(ipcaAnual, 'aa')
  const parcelas = []
  let saldo = financiado
  let acumulado = 0
  for (let m = 1; m <= carencia; m++) {
    const correcao = saldo * c
    saldo += correcao
    acumulado = (saldo + acumulado) * i + acumulado // juros do mês sobre o saldo corrigido + juros ainda não pagos (capitalização dentro do período)
    const paga = m % periodicidade === 0 || m === carencia
    parcelas.push({ mes: m, correcao, juros: paga ? acumulado : 0, amortizacao: 0, parcela: paga ? acumulado : 0, saldo, carencia: true })
    if (paga) acumulado = 0
  }
  const n = prazo - carencia
  for (let k = 1; k <= n; k++) {
    const correcao = saldo * c
    saldo += correcao
    const juros = saldo * i
    const restantes = n - k + 1
    const pmt = i === 0 ? saldo / restantes : (saldo * i) / (1 - (1 + i) ** -restantes)
    const amortizacao = sistema === 'price' ? pmt - juros : saldo / restantes
    saldo = Math.max(0, saldo - amortizacao)
    parcelas.push({ mes: carencia + k, correcao, juros, amortizacao, parcela: juros + amortizacao, saldo, carencia: false })
  }
  return parcelas
}

// IOF de crédito PJ sobre o cronograma: adicional único sobre o financiado + alíquota diária sobre o principal de cada parcela pelos dias
// até o vencimento (meses de 365/12 dias, contando a carência), limitados a 365 dias. iof = { fixed, daily } em %.
export function iofCronograma(financiado, parcelas, iof = IOF_PJ) {
  const fixo = (financiado * (iof.fixed ?? 0)) / 100
  const base = parcelas.reduce((a, p) => a + p.amortizacao * Math.min(Math.round((p.mes * 365) / 12), IOF_PJ.maxDays), 0)
  const diario = (base * (iof.daily ?? 0)) / 100
  return { fixo, diario, total: fixo + diario }
}

// Resumo da operação. Entradas em % a.a. e R$. Na TFB, custoFinanceiro é a TFB e a taxa é nominal. Na TLP, custoFinanceiro é a
// TLP (parcela prefixada, real) e `ipca` é a projeção anual: a taxa de juros composta é real e o saldo é corrigido pelo IPCA.
export function simular({ valor, participacao = 100, prazo, carencia = 0, custo, custoFinanceiro, ipca = 0, taxaBndes, taxaAgente, sistema = 'sac', periodicidade = 1, composicao = 'capitalizada', iof = IOF_PJ }) {
  const check = conferir({ valor, participacao, prazo, carencia, custo })
  const iofOk = iof && [iof.fixed, iof.daily].every((v) => Number.isFinite(v) && v >= 0 && v <= 100)
  const ipcaOk = custo !== 'tlp' || (Number.isFinite(ipca) && ipca >= -50 && ipca <= 100)
  if (check.erros.length || !iofOk || !ipcaOk || ![custoFinanceiro, taxaBndes, taxaAgente].every((v) => Number.isFinite(v) && v >= 0 && v <= 100)) return { ok: false, ...check }
  const financiado = check.financiado
  const taxa = taxaFinal(custoFinanceiro, taxaBndes, taxaAgente, composicao)
  const ipcaAnual = custo === 'tlp' ? ipca : 0
  const parcelas = cronograma({ financiado, prazo, carencia, taxaAnual: taxa, sistema, periodicidade, ipcaAnual })
  const jurosCarencia = parcelas.filter((p) => p.carencia).reduce((a, p) => a + p.juros, 0)
  const juros = parcelas.reduce((a, p) => a + p.juros, 0)
  const correcao = parcelas.reduce((a, p) => a + p.correcao, 0)
  const amort = parcelas.filter((p) => !p.carencia)
  const iofCalc = iofCronograma(financiado, parcelas, iof)
  return {
    ok: true, financiado, taxa, taxaMensal: monthlyRate(taxa, 'aa') * 100, taxaNominal: custo === 'tlp' ? tlpNominal(taxa, ipca) : taxa, composicao, parcelas,
    jurosCarencia, juros, correcao, iof: iofCalc.total, iofFixo: iofCalc.fixo, iofDiario: iofCalc.diario,
    primeiraParcela: amort[0]?.parcela ?? 0, ultimaParcela: amort.at(-1)?.parcela ?? 0, parcelasAmortizacao: amort.length,
    total: financiado + correcao + juros + iofCalc.total, recursosProprios: valor - financiado, avisos: check.avisos,
  }
}

// Equivalente em CDI + spread (composto): o spread que, capitalizado sobre o CDI atual, dá a mesma taxa final.
export const spreadSobreCdi = (taxa, cdi) => (Number.isFinite(cdi) ? ((1 + taxa / 100) / (1 + cdi / 100) - 1) * 100 : null)

// IPCA esperado para a projeção da TLP: a mediana do Focus do ano seguinte (a operação dura anos; o ano corrente está quase fechado),
// ou do ano corrente quando o seguinte ainda não existe. Devolve { ano, valor } ou null.
export function ipcaEsperado(focus, agora = Date.now()) {
  const row = focus?.rows?.find((r) => r.indicator === 'IPCA')
  const y = new Date(agora).getFullYear()
  for (const ano of [String(y + 1), String(y)]) {
    const v = row?.values?.[ano]?.median
    if (Number.isFinite(v)) return { ano, valor: v }
  }
  return null
}
