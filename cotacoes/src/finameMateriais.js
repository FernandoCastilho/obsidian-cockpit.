// BNDES Finame Materiais (Materiais Industrializados): regras do produto, base legal e a conta da operação indireta.
// Regras conforme a página do produto e as circulares do BNDES vigentes em novembro de 2026 (ver FONTES); o agente financeiro
// confirma as condições de cada operação. A tela mostra a data da regra e avisa o que precisa de conferência.
import { IOF_PJ, monthlyRate } from './emprestimo.js'

export const REGRAS = {
  conferidoEm: '2026-11-04',
  prazoMaxMeses: 84, // até 7 anos
  carenciaMaxMeses: 24, // até 2 anos
  carenciaMaxTfbMeses: 12, // com TFB, Taxa Fixa Composta ou Taxa Fixa Composta MPME, carência de até 1 ano
  participacaoMinPct: 1,
  participacaoMaxPct: 100,
  tetoOperacao: 20_000_000, // por operação
  tetoCliente12m: 150_000_000, // por cliente a cada 12 meses, da homologação
  taxaBndes: { 'mpme-nne': 0.95, mpme: 1.25, grande: 1.25 }, // % a.a. (página do produto, lida em 04/11/2026); 1,25% desde 22/01/2026 segundo a Abimaq
  selicSuspensa: 'Circular SUP/ADIG nº 09/2026, de 22/01/2026 (altera a Circular SUP/ADIG nº 13/2022)',
  reembolsoMeses: 12, // notas fiscais emitidas até 12 meses antes do protocolo
  itens: 'bens industrializados novos, de fabricação nacional e credenciados no BNDES (cerca de 2.500 itens por NCM), usados na atividade do cliente',
  foraDoProduto: 'alimentos, bebidas, combustíveis, lubrificantes e máquinas ou equipamentos credenciáveis no CFI (esses vão para o Finame tradicional)',
  nacionalizacao: 'conteúdo importado de até 40% ou cumprimento do Processo Produtivo Básico (PPB), conforme o credenciamento',
  // IOF: alíquota zero. O Finame Materiais é operação "efetuada com recursos da Agência Especial de Financiamento Industrial - FINAME"
  // (Decreto 6.306/2007, art. 8º, IX, vigente no texto consolidado lido em 04/11/2026), e o adicional de 0,38% do art. 8º, § 5º, só
  // alcança os incisos que ele lista (I, IV, V, VI, X, XI, XIV, XVI, XVIII, XIX, XXI e XXVI), não o IX. A alíquota zero geral das
  // operações do BNDES (art. 8º, XXX) foi revogada pelo Decreto 8.511/2015 sem afetar o inciso IX. É assim que o mercado contrata
  // (condições do produto divulgadas pela Abimaq em 16/01/2026: sem incidência de IOF). Se o agente cobrar (funding diverso),
  // vale o IOF de crédito PJ: 0,38% + 0,0082% ao dia sobre o principal de cada parcela, até 365 dias (Decreto 12.499/2025).
  iof: 'Sem IOF: a operação é feita com recursos da FINAME e tem alíquota zero (Decreto 6.306/2007, art. 8º, IX, vigente), sem o adicional de 0,38% do § 5º, que só alcança os incisos que ele lista. É assim que o mercado contrata (condições divulgadas pela Abimaq em 16/01/2026: sem incidência de IOF); a revogação da alíquota zero geral do BNDES (art. 8º, XXX, pelo Decreto 8.511/2015) não afeta o inciso IX. Só se o agente cobrar, por funding diverso, vale o IOF de crédito de pessoa jurídica: 0,38% sobre o valor, uma vez, mais 0,0082% ao dia sobre o principal de cada parcela, até 365 dias (Decreto 12.499/2025; optante do Simples Nacional até R$ 30 mil: 0,00274% ao dia)',
}
// Base legal e fontes de cada regra (o que foi confirmado e como). "indexada": trecho da página oficial lido pelo buscador; a página em si não abriu nesta rede.
export const FONTES = [
  { regra: 'Custo financeiro: TFB, TFBD, TLP, Taxa LCD, Taxa Fixa Composta ou Taxa Fixa Composta MPME; taxa do BNDES de 0,95% a.a. (MPME N/NE) ou 1,25% a.a. (MPME nas demais regiões e grandes); taxa do agente negociada; Selic suspensa (Circular SUP/ADIG nº 09/2026, de 22/01/2026)', fonte: 'Página do produto BNDES Finame Materiais Industrializados, lida em 04/11/2026', url: 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/finame-materiais-industrializados' },
  { regra: 'Prazo total de até 7 anos, com até 2 anos de carência (1 ano com TFB, Taxa Fixa Composta ou Taxa Fixa Composta MPME); participação de até 100% dos itens financiáveis; limite de R$ 150 milhões por cliente a cada 12 meses da homologação; notas emitidas até 12 meses antes do protocolo; garantia livre, FGI admitido', fonte: 'Página do produto, lida em 04/11/2026', url: 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/finame-materiais-industrializados' },
  { regra: 'Teto de R$ 20 milhões por operação; itens, exclusões e nacionalização (conteúdo importado até 40% ou PPB)', fonte: 'Itens e nacionalização na página do produto; o teto por operação vem de Observatório da Indústria RS, Fomento Paraná e e-book CNI 2025 (secundárias; não consta na página oficial lida em 04/11/2026)', url: 'https://observatoriodaindustriars.org.br/solucao/bndes-finame-materiais/' },
  { regra: 'TFC (Taxa Fixa Composta): prefixada, combinação de duas taxas fixas; séries TFC_60.90, TFC_120.90, TFC_MPME_60.90 e TFC_MPME_120.90 (códigos C01 a C04) por faixa de prazo (até 60 ou 61 a 120 meses) e porte, com liberação em 90 dias; TFB por faixa de prazo e liberação em 30 ou 90 dias', fonte: 'Guia de custos financeiros e Moedas Contratuais do BNDES, lidos em 04/11/2026; séries coletadas pelo painel (aba BNDES)', url: 'https://www.bndes.gov.br/moedas' },
  { regra: 'Composição da taxa final: fator do custo financeiro × fator da taxa do BNDES × fator da taxa do agente − 1 (exemplo oficial: 1,07 × 1,015 × 1,03 − 1 = 11,86% a.a.)', fonte: 'Guia "Taxa de juros" do BNDES, lido em 04/11/2026', url: 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/guia/taxa-de-juros' },
  { regra: 'TLP: parcela prefixada (taxa real) mais IPCA', fonte: 'Lei 13.483/2017 e Resolução CMN 4.600/2017; guia de custos financeiros do BNDES', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13483.htm' },
  { regra: 'IOF: alíquota zero na operação com recursos da FINAME (art. 8º, IX), sem o adicional de 0,38% (§ 5º não lista o inciso IX); se cobrado por funding diverso, crédito PJ 0,38% + 0,0082% ao dia sobre o principal de cada parcela, até 365 dias', fonte: 'Decreto 6.306/2007, texto consolidado na Câmara dos Deputados, lido em 04/11/2026: art. 8º, IX vigente, XXX revogado pelo Decreto 8.511/2015, § 5º; art. 7º, I, b e § 1º; Decreto 12.499/2025; condições do Finame Materiais divulgadas pela Abimaq em 16/01/2026 (sem incidência de IOF)', url: 'https://www2.camara.leg.br/legin/fed/decret/2007/decreto-6306-14-dezembro-2007-566561-normaatualizada-pe.html' },
]
export const PORTES = [
  { id: 'mpme-nne', label: 'MPME no Norte ou Nordeste', taxa: REGRAS.taxaBndes['mpme-nne'], mpme: true },
  { id: 'mpme', label: 'MPME nas demais regiões', taxa: REGRAS.taxaBndes.mpme, mpme: true },
  { id: 'grande', label: 'Grande empresa', taxa: REGRAS.taxaBndes.grande, mpme: false },
]
export const CUSTOS = [
  { id: 'tfc', label: 'TFC (prefixada)', hint: 'Taxa Fixa Composta: prefixada, combinação de duas taxas fixas do BNDES, com série própria para MPME, por faixa de prazo (até 60 ou 61 a 120 meses) e liberação em 90 dias. Carência de até 12 meses.' },
  { id: 'tfb', label: 'TFB (prefixada)', hint: 'Taxa Fixa do BNDES, cotada na contratação, por faixa de prazo e prazo de liberação (30 ou 90 dias). Carência de até 12 meses.' },
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
// Faixa da TFC pelo prazo total (até 60 ou 61 a 120 meses) e código da série nas Moedas Contratuais, por porte (MPME tem série própria).
export const faixaTfc = (prazoMeses) => (prazoMeses <= 60 ? 60 : 120)
export const TFC_CODIGOS = { grande: { 60: 'C01', 120: 'C02' }, mpme: { 60: 'C03', 120: 'C04' } }
export const TFC_NOMES = { C01: 'TFC_60.90', C02: 'TFC_120.90', C03: 'TFC_MPME_60.90', C04: 'TFC_MPME_120.90' }
export const codigoTfc = (porte, prazoMeses) => TFC_CODIGOS[PORTES.find((p) => p.id === porte)?.mpme ? 'mpme' : 'grande'][faixaTfc(prazoMeses)]
export const CUSTOS_FIXOS = new Set(['tfb', 'tfc'])

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
    const fixa = CUSTOS_FIXOS.has(custo)
    const max = fixa ? REGRAS.carenciaMaxTfbMeses : REGRAS.carenciaMaxMeses
    if (carencia > max) erros.push(`Carência acima do máximo: ${max} meses${fixa ? ` com ${custo.toUpperCase()} (1 ano)` : ' (2 anos)'}.`)
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
// Devolve parcelas [{ mes, correcao, juros, amortizacao, principal, parcela, saldo, carencia }]; `principal` é a parte da
// amortização que corresponde ao valor entregue (amortização sem a correção acumulada): a soma dos principais é o financiado, e é
// sobre ele que incide o IOF diário (Decreto 6.306/2007, art. 7º, I, b: "valor do principal de cada uma das parcelas").
export function cronograma({ financiado, prazo, carencia, taxaAnual, sistema, periodicidade = 1, ipcaAnual = 0 }) {
  const i = monthlyRate(taxaAnual, 'aa'), c = monthlyRate(ipcaAnual, 'aa')
  const parcelas = []
  let saldo = financiado
  let fator = 1 // correção acumulada desde a liberação
  let acumulado = 0
  for (let m = 1; m <= carencia; m++) {
    const correcao = saldo * c
    saldo += correcao; fator *= 1 + c
    acumulado = (saldo + acumulado) * i + acumulado // juros do mês sobre o saldo corrigido + juros ainda não pagos (capitalização dentro do período)
    const paga = m % periodicidade === 0 || m === carencia
    parcelas.push({ mes: m, correcao, juros: paga ? acumulado : 0, amortizacao: 0, principal: 0, parcela: paga ? acumulado : 0, saldo, carencia: true })
    if (paga) acumulado = 0
  }
  const n = prazo - carencia
  for (let k = 1; k <= n; k++) {
    const correcao = saldo * c
    saldo += correcao; fator *= 1 + c
    const juros = saldo * i
    const restantes = n - k + 1
    const pmt = i === 0 ? saldo / restantes : (saldo * i) / (1 - (1 + i) ** -restantes)
    const amortizacao = sistema === 'price' ? pmt - juros : saldo / restantes
    saldo = Math.max(0, saldo - amortizacao)
    parcelas.push({ mes: carencia + k, correcao, juros, amortizacao, principal: amortizacao / fator, parcela: juros + amortizacao, saldo, carencia: false })
  }
  return parcelas
}

// IOF de crédito PJ sobre o cronograma: adicional único sobre o financiado + alíquota diária sobre o principal de cada parcela (sem a
// correção pelo IPCA) pelos dias até o vencimento (meses de 365/12 dias, contando a carência), limitados a 365 dias (Decreto 6.306/2007,
// art. 7º, § 1º). Por construção, nunca passa de financiado × (fixed + maxDays × daily). iof = { fixed, daily, maxDays? } em % e dias.
export function iofCronograma(financiado, parcelas, iof = IOF_PJ) {
  const maxDias = iof.maxDays ?? IOF_PJ.maxDays
  const fixo = (financiado * (iof.fixed ?? 0)) / 100
  const porParcela = parcelas.map((p) => ((p.principal ?? p.amortizacao) * Math.min(Math.round((p.mes * 365) / 12), maxDias) * (iof.daily ?? 0)) / 100)
  const diario = porParcela.reduce((a, v) => a + v, 0)
  return { fixo, diario, total: fixo + diario, porParcela }
}

// Vencimento da parcela `mes` contado da liberação: mesmo dia do mês, recuando para o último dia quando o mês é mais curto.
export function vencimento(liberacao, mes) {
  const d = new Date(liberacao)
  const alvo = new Date(d.getFullYear(), d.getMonth() + mes + 1, 0) // último dia do mês-alvo
  return new Date(d.getFullYear(), d.getMonth() + mes, Math.min(d.getDate(), alvo.getDate()))
}

// Resumo da operação. Entradas em % a.a. e R$. Na TFB e na TFC, custoFinanceiro é a taxa fixa e a taxa é nominal. Na TLP, custoFinanceiro é a
// TLP (parcela prefixada, real) e `ipca` é a projeção anual: a taxa de juros composta é real e o saldo é corrigido pelo IPCA.
export const IOF_ZERO = { fixed: 0, daily: 0 }
export function simular({ valor, participacao = 100, prazo, carencia = 0, custo, custoFinanceiro, ipca = 0, taxaBndes, taxaAgente, sistema = 'sac', periodicidade = 1, composicao = 'capitalizada', iof = IOF_ZERO }) {
  const check = conferir({ valor, participacao, prazo, carencia, custo })
  const iofOk = iof && [iof.fixed, iof.daily].every((v) => Number.isFinite(v) && v >= 0 && v <= 100)
  const ipcaOk = custo !== 'tlp' || (Number.isFinite(ipca) && ipca >= -50 && ipca <= 100)
  const taxasOk = [custoFinanceiro, taxaBndes, taxaAgente].every((v) => Number.isFinite(v) && v >= 0 && v <= 100)
  if (!taxasOk) check.erros.push('Informe o custo financeiro, a taxa do BNDES e a taxa do agente em % a.a.')
  if (!ipcaOk) check.erros.push('Informe o IPCA esperado em % a.a.')
  if (!iofOk) check.erros.push('Informe as alíquotas do IOF em % (0 e 0 se o agente confirmar alíquota zero).')
  if (check.erros.length) return { ok: false, ...check }
  const financiado = check.financiado
  const taxa = taxaFinal(custoFinanceiro, taxaBndes, taxaAgente, composicao)
  const ipcaAnual = custo === 'tlp' ? ipca : 0
  const parcelas = cronograma({ financiado, prazo, carencia, taxaAnual: taxa, sistema, periodicidade, ipcaAnual })
  const jurosCarencia = parcelas.filter((p) => p.carencia).reduce((a, p) => a + p.juros, 0)
  const juros = parcelas.reduce((a, p) => a + p.juros, 0)
  const correcao = parcelas.reduce((a, p) => a + p.correcao, 0)
  const amort = parcelas.filter((p) => !p.carencia)
  const iofCalc = iofCronograma(financiado, parcelas, iof)
  // Fluxo parcela a parcela: saldo inicial (antes da correção do mês), IOF diário da parcela e total pago no vencimento.
  const fluxo = parcelas.map((p, k) => ({ ...p, saldoInicial: k ? parcelas[k - 1].saldo : financiado, iof: iofCalc.porParcela[k], pago: p.parcela + iofCalc.porParcela[k] }))
  return {
    ok: true, financiado, taxa, taxaMensal: monthlyRate(taxa, 'aa') * 100, taxaNominal: custo === 'tlp' ? tlpNominal(taxa, ipca) : taxa, composicao, parcelas: fluxo,
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
