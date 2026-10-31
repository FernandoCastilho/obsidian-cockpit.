import { nf } from './format.js'
// Aba "Aprender": conceitos explicados em linguagem simples. Os números dos exemplos saem das funções abaixo (testadas),
// nunca digitados no texto, para a tela não mostrar uma conta errada. Exemplos são didáticos, não cotações de mercado.


// Paridade coberta de juros: (1 + i_BRL) = (1 + i_USD) × F / S  →  i_USD = (1 + i_BRL) × S / F − 1 (taxas anuais compostas, para o exemplo).
export const cupomCambial = ({ spot, futuro, di }) => ((1 + di) * spot) / futuro - 1

// Diferencial de juros entre duas moedas, composto: (1 + i_BRL) ÷ (1 + i_USD) − 1 (taxas anuais). A conta rápida, i_BRL − i_USD, é uma aproximação.
export const diferencialDeJuros = (brl, usd) => (1 + brl) / (1 + usd) - 1

// Dólar futuro de equilíbrio (paridade coberta): à vista × (1 + i_BRL) ÷ (1 + i_USD). Acima dele, quem aplicou em reais perde para o câmbio.
export const dolarDeEquilibrio = ({ spot, brl, usd }) => (spot * (1 + brl)) / (1 + usd)

// Juros de um dia de um empréstimo overnight, convenção ACT/360 (a da SOFR).
export const jurosDeUmDia = (principal, taxaAnual) => (principal * taxaAnual) / 360

// Juros do primeiro ano de um financiamento indexado: saldo × (indexador + spread), saldo constante (simplificação didática).
export const jurosAnuais = (saldo, indexador, spread) => saldo * (indexador + spread)

// Custo médio ponderado das fontes de captação: fontes = [{ valor, custo }], custo em fração ao ano.
export const custoMedio = (fontes) => {
  const total = fontes.reduce((s, f) => s + f.valor, 0)
  return total > 0 ? fontes.reduce((s, f) => s + f.valor * f.custo, 0) / total : NaN
}

// Prêmio anual de um CDS: spread em pontos-base × valor protegido (100 pb = 1% ao ano).
export const premioCds = (nocional, pontosBase) => (nocional * pontosBase) / 10000

// Liquidação antecipada de um contrato prefixado, juros compostos anuais.
// Na curva: o saldo cresce pela taxa contratada até a data (principal × (1 + taxa)^anos decorridos).
export const valorNaCurva = ({ principal, taxa, anosDecorridos }) => principal * (1 + taxa) ** anosDecorridos
// A mercado: o valor de resgate no vencimento, trazido a valor presente pela taxa de mercado do prazo que falta.
export const valorAMercado = ({ principal, taxa, anosTotal, taxaMercado, anosRestantes }) => (principal * (1 + taxa) ** anosTotal) / (1 + taxaMercado) ** anosRestantes
// Break funding: o credor mantém a captação até o vencimento (saldo × (1 + taxa de funding)^restante) e só consegue reaplicar o que recebe à taxa de mercado.
// O custo é a diferença, a valor presente pela taxa de reaplicação; nunca negativo (reaplicar acima do funding não gera cobrança).
export const breakFunding = ({ captado, taxaFunding, anosDecorridos, taxaReaplicacao, anosRestantes }) => {
  const saldo = captado * (1 + taxaFunding) ** anosDecorridos
  return Math.max(0, saldo * (((1 + taxaFunding) / (1 + taxaReaplicacao)) ** anosRestantes - 1))
}

// Remuneração pós-fixada CDI + spread: o spread compõe com o CDI (não se soma). Taxas anuais em fração.
export const taxaCdiMaisSpread = (cdi, spread) => (1 + cdi) * (1 + spread) - 1

// Juros de um prazo, a juros compostos: principal × ((1 + taxa anual)^t − 1), com t em fração do ano (CDI: dias úteis ÷ 252).
export const jurosNoPrazo = ({ principal, taxaAnual, fracaoAno }) => principal * ((1 + taxaAnual) ** fracaoAno - 1)

// FIDC: índice de subordinação (cotas subordinadas sobre o total de cotas) e a distribuição de uma perda da carteira.
export const indiceSubordinacao = ({ senior, subordinada }) => subordinada / (senior + subordinada)
// A perda consome primeiro a cota subordinada; só o que passa dela atinge a sênior.
export const perdaNasCotas = ({ senior, subordinada, perda }) => ({ subordinada: Math.min(subordinada, perda), senior: Math.min(senior, Math.max(0, perda - subordinada)) })

// Inflação acumulada: produto dos fatores mensais, não a soma. Taxas mensais em fração.
export const inflacaoAcumulada = (mensais) => mensais.reduce((f, m) => f * (1 + m), 1) - 1
// Juro real (equação de Fisher): (1 + nominal) ÷ (1 + inflação) − 1.
export const juroReal = (nominal, inflacao) => (1 + nominal) / (1 + inflacao) - 1

// Commodities: soja em dólar por tonelada vira real por saca de 60 kg; o galão americano (3,78541 L) vira litro.
export const sacaEmReais = (usdPorTonelada, cambio) => usdPorTonelada * 0.06 * cambio
export const galaoParaLitro = (usdPorGalao, cambio) => (usdPorGalao / 3.78541) * cambio

const EX_DIFERENCIAL = { brl: 0.14, usd: 0.04, spot: 5 }
const EX_CUPOM = { spot: 5, futuro: 5.5, di: 0.14 }
const EX_CUPOM_2 = { spot: 5, futuro: 5.25, di: 0.14 }
const EX_SOFR = { principal: 1_000_000, taxa: 0.043 }
const EX_EURIBOR = { saldo: 200_000, indexador: 0.03, spread: 0.01 }
const EX_FUNDING = { fontes: [{ nome: 'CDB', valor: 60, custo: 0.14 }, { nome: 'LCI', valor: 30, custo: 0.13 }, { nome: 'Capital próprio', valor: 10, custo: 0 }], taxaEmprestimo: 0.18 }
const EX_LIQ = { principal: 1_000_000, taxa: 0.15, anosTotal: 2, anosDecorridos: 1, anosRestantes: 1, taxaMercado: 0.12, taxaFunding: 0.13 }
const EX_DEB = { principal: 1_000_000, cdi: 0.14, spread: 0.02 }
const EX_NC = { principal: 5_000_000, cdi: 0.14, spread: 0.03, diasUteis: 126 }
const EX_FIDC = { senior: 7_000_000, subordinada: 3_000_000, perdas: [2_000_000, 4_000_000] }
const EX_INFL = { mensal: 0.004, meses: 12, selic: 0.145 }
const EX_SACA = { usd: 520, antes: 5, depois: 5.5 }
const EX_ICBR = { indiceUsd: 1, altaDolar: 0.1, quedaUsd: -0.05 }
const EX_BOMBA = { usdGalao: 2.2, cambio: 5.4, bomba: 6.5 }
const EX_CDS = { nocional: 10_000_000, pb: 200 }

const money = (v, sym) => `${sym} ${nf(v, 0)}`
const pct = (f, d = 2) => `${nf(f * 100, d)}%`

export const CONCEITOS = [
  {
    id: 'diferencial-de-juros',
    topico: 'Juros e câmbio',
    nome: 'Diferencial de juros',
    frase: 'É a diferença entre a taxa de juros de duas moedas (ou países), por exemplo o juro em reais menos o juro em dólares.',
    crianca: [
      'Se aplicar dinheiro no Brasil rende 14% ao ano e nos Estados Unidos rende 4%, o Brasil paga mais. Essa distância é o diferencial de juros.',
      'Quem toma dinheiro emprestado onde o juro é baixo e aplica onde é alto parece ganhar a diferença. Essa operação se chama carry trade. Só que as moedas oscilam: se a moeda da aplicação perde valor, a vantagem encolhe ou vira prejuízo.',
      'Por isso o mercado já embute o diferencial no dólar futuro. Quem trava o câmbio da volta (faz hedge) deixa de ter ganho extra sem risco: é a ideia da paridade coberta de juros, a mesma que dá origem ao cupom cambial.',
    ],
    analogia: 'É como dois bancos na mesma rua pagando taxas diferentes: o que paga mais atrai o dinheiro, mas, se para depositar você precisa trocar de moeda e ela cai, a vantagem pode sumir.',
    lacunas: [
      'Não é lucro garantido: o ganho só se mantém se a moeda da aplicação se desvalorizar menos do que o diferencial.',
      'Diferencial nominal não é diferencial real: se a inflação dos dois países é diferente, o juro real entre eles também é.',
      'Pela paridade descoberta de juros, o câmbio deveria se mover para compensar o diferencial; na prática isso falha no curto prazo (em geral, menos de um ano), e é aí que o carry trade encontra espaço (e também o risco).',
    ],
    preciso: {
      texto: 'Com taxas anuais compostas i_BRL e i_USD, o diferencial exato é a razão dos fatores de juros. Na paridade coberta, ele é igual ao prêmio do dólar futuro sobre o à vista (F = dólar futuro, S = dólar à vista):',
      formula: 'diferencial = (1 + i_BRL) ÷ (1 + i_USD) − 1 = F ÷ S − 1',
    },
    exemplo: (() => {
      const d = diferencialDeJuros(EX_DIFERENCIAL.brl, EX_DIFERENCIAL.usd)
      const f = dolarDeEquilibrio(EX_DIFERENCIAL)
      return {
        titulo: 'Conta com números redondos',
        passos: [
          `Juro em reais: ${pct(EX_DIFERENCIAL.brl, 0)} ao ano. Juro em dólares: ${pct(EX_DIFERENCIAL.usd, 0)} ao ano. Dólar à vista: R$ ${nf(EX_DIFERENCIAL.spot)}.`,
          `Diferencial = (1 + ${nf(EX_DIFERENCIAL.brl)}) ÷ (1 + ${nf(EX_DIFERENCIAL.usd)}) − 1 = ${pct(d)} ao ano. A conta rápida, ${pct(EX_DIFERENCIAL.brl, 0)} − ${pct(EX_DIFERENCIAL.usd, 0)}, dá ${nf((EX_DIFERENCIAL.brl - EX_DIFERENCIAL.usd) * 100, 0)} pontos percentuais.`,
          `Dólar de equilíbrio em 1 ano = ${nf(EX_DIFERENCIAL.spot)} × ${nf(EX_DIFERENCIAL.brl + 1)} ÷ ${nf(EX_DIFERENCIAL.usd + 1)} = R$ ${nf(f)}.`,
        ],
        resultado: `Se o dólar estiver abaixo de R$ ${nf(f)} em 1 ano, quem aplicou em reais ganhou mais do que aplicando em dólares; acima disso, o câmbio consumiu a vantagem.`,
      }
    })(),
    noApp: { texto: 'Aba Juros: compare o DI (Brasil), os Treasuries (EUA) e o cupom cambial, que é esse diferencial já descontado do dólar futuro.', tab: 'juros' },
    teste: {
      pergunta: 'Se o juro em reais sobe e o juro em dólares fica igual, o diferencial sobe ou cai?',
      resposta: 'Sobe. A vantagem de aplicar em reais aumenta, e o carry trade tende a ficar mais atrativo se o câmbio ficar estável. O risco de o dólar subir continua existindo.',
    },
  },
  {
    id: 'cupom-cambial',
    topico: 'Juros e câmbio',
    nome: 'Cupom cambial',
    frase: 'É o juro em dólar que o mercado brasileiro está embutindo, calculado a partir do juro em reais e do dólar futuro.',
    crianca: [
      'Você pode guardar dinheiro de duas formas: em reais, que rendem, por exemplo, 14% ao ano, ou em dólares. O problema é que o dólar sobe e desce.',
      'O mercado já combina hoje por quanto vai vender o dólar daqui a um ano: é o dólar futuro. Se esse dólar futuro já está mais caro que o de hoje, boa parte dos 14% do real é só compensação pela alta do dólar.',
      'Tire essa compensação dos 14%. O que sobrar é o juro que você ganharia em dólares. Esse é o cupom cambial.',
    ],
    analogia: 'É como trocar de moeda e já travar o preço da volta: o ganho que resta, em dólar, depois de combinada a volta, é o cupom.',
    lacunas: [
      'Não é a variação do dólar. É um juro, expresso ao ano.',
      'Não é o juro dos EUA. A diferença entre o cupom cambial e o juro americano de mesmo prazo reflete o prêmio de risco de operar em dólar no Brasil.',
      'O mercado costuma cotar o cupom em taxa linear, base 360 dias corridos (convenção da B3 para o DI x dólar). O exemplo ao lado usa taxa composta anual só para simplificar.',
    ],
    preciso: {
      texto: 'Vem da paridade coberta de juros: quem aplica em reais e trava a volta ao dólar no futuro deve obter o mesmo que aplicando em dólar. Logo, com S = dólar à vista, F = dólar futuro e i = taxa DI no mesmo prazo:',
      formula: 'cupom = (1 + DI) × S ÷ F − 1',
    },
    exemplo: (() => {
      const a = cupomCambial(EX_CUPOM)
      const b = cupomCambial(EX_CUPOM_2)
      return {
        titulo: 'Conta com números redondos',
        passos: [
          `Dólar à vista: R$ ${nf(EX_CUPOM.spot)}. Dólar futuro em 1 ano: R$ ${nf(EX_CUPOM.futuro)}. DI de 1 ano: ${pct(EX_CUPOM.di, 0)}.`,
          `Cupom = (1 + ${nf(EX_CUPOM.di)}) × ${nf(EX_CUPOM.spot)} ÷ ${nf(EX_CUPOM.futuro)} − 1 = ${pct(a)} ao ano.`,
          `Se o dólar futuro fosse R$ ${nf(EX_CUPOM_2.futuro)} (mais perto do à vista), o cupom subiria para ${pct(b)}.`,
        ],
        resultado: `Cupom de ${pct(a)} ao ano: quase todo o juro do real foi “consumido” pela alta esperada do dólar.`,
      }
    })(),
    noApp: { texto: 'Aba Juros, “Brasil · Cupom cambial” (curva DI x dólar da B3).', tab: 'juros' },
    teste: {
      pergunta: 'Se o dólar futuro sobe e o DI fica igual, o cupom cambial sobe ou cai?',
      resposta: 'Cai. O dólar futuro está no denominador: quanto maior o F, menor o cupom. Mais do juro do real passa a ser compensação cambial.',
    },
  },
  {
    id: 'sofr',
    topico: 'Juros e câmbio',
    nome: 'SOFR',
    frase: 'É a taxa de juros de um dia para empréstimos em dólar com garantia de títulos do Tesouro americano.',
    crianca: [
      'Alguém precisa de dinheiro só até amanhã e deixa como garantia um título do governo dos EUA. Quem empresta sabe que, se não for pago, fica com o título.',
      'O juro desse empréstimo de uma noite, medido em milhares de operações reais, é a SOFR. Como tem garantia, é considerada uma taxa quase sem risco.',
    ],
    analogia: 'É o “preço do dinheiro por uma noite” no mercado americano, com penhor.',
    lacunas: [
      'Não é a taxa do Fed. O Fed define uma faixa-alvo; a SOFR é o que o mercado de fato pratica, e fica perto dela, mas não igual.',
      'É de um dia. Para prazos longos usam-se médias compostas (30, 90, 180 dias) ou taxas a termo; o app mostra as médias.',
      'Substituiu a LIBOR em dólar como referência de contratos.',
    ],
    preciso: {
      texto: 'Publicada pelo Federal Reserve de Nova York todo dia útil, por volta das 8h (horário de Nova York), referente às operações do dia útil anterior. É a mediana, ponderada pelo volume, das operações de recompra (repo) de um dia garantidas por Treasuries. Juros calculados em ACT/360:',
      formula: 'juros do dia = principal × SOFR ÷ 360',
    },
    exemplo: {
      titulo: 'Quanto custa uma noite',
      passos: [
        `Empréstimo de ${money(EX_SOFR.principal, 'US$')} com SOFR de ${pct(EX_SOFR.taxa)} ao ano.`,
        `Juros de 1 dia = ${nf(EX_SOFR.principal, 0)} × ${nf(EX_SOFR.taxa * 100)}% ÷ 360 ≈ US$ ${nf(jurosDeUmDia(EX_SOFR.principal, EX_SOFR.taxa))}.`,
      ],
      resultado: `Cerca de US$ ${nf(jurosDeUmDia(EX_SOFR.principal, EX_SOFR.taxa))} por noite.`,
    },
    noApp: { texto: 'Aba Juros: gráfico da SOFR (taxa do dia, médias de 30/90/180 dias e faixa de percentis) e a linha “EUA · SOFR overnight” em Juros de referência.', tab: 'juros' },
    teste: {
      pergunta: 'Por que a SOFR é tratada como uma taxa quase sem risco?',
      resposta: 'Porque o empréstimo é de um dia e tem como garantia títulos do Tesouro americano. Quem empresta pode ficar com o título se não for pago.',
    },
  },
  {
    id: 'euribor',
    topico: 'Juros e câmbio',
    nome: 'Euribor',
    frase: 'É o juro de referência em euros para empréstimos entre bancos europeus, em prazos de uma semana a 12 meses.',
    crianca: [
      'Os bancos emprestam dinheiro uns aos outros. A Euribor é o “preço médio” desse empréstimo, em euros, divulgado todo dia para vários prazos.',
      'Muita gente na Europa tem financiamento da casa escrito como “Euribor + 1%”. Quando a Euribor sobe, a prestação sobe junto.',
    ],
    analogia: 'É a “tabela de preço” do dinheiro em euros entre bancos; os contratos se penduram nela.',
    lacunas: [
      'Não é a taxa do Banco Central Europeu (BCE). O BCE fixa a taxa de depósito; a Euribor reage a ela e às expectativas sobre ela.',
      'Não existe uma Euribor só: há uma por prazo (1 semana, 1, 3, 6 e 12 meses).',
      'Administrada pelo EMMI. Desde 2019 usa uma metodologia “híbrida”, que prioriza transações reais em vez de só cotações informadas.',
    ],
    preciso: {
      texto: 'Referência de crédito e de derivativos em euros (swaps de juros, hipotecas de taxa variável). Juros em ACT/360. Um contrato indexado soma a Euribor do prazo escolhido a um spread fixo:',
      formula: 'taxa do contrato = Euribor (prazo) + spread',
    },
    exemplo: {
      titulo: 'Financiamento “Euribor + spread”',
      passos: [
        `Saldo de ${money(EX_EURIBOR.saldo, '€')}, Euribor 12 meses de ${pct(EX_EURIBOR.indexador)} e spread de ${pct(EX_EURIBOR.spread)}.`,
        `Taxa do contrato = ${pct(EX_EURIBOR.indexador + EX_EURIBOR.spread)} ao ano → juros do ano ≈ ${money(jurosAnuais(EX_EURIBOR.saldo, EX_EURIBOR.indexador, EX_EURIBOR.spread), '€')}.`,
        `Se a Euribor subir 1 ponto percentual, os juros passam a ≈ ${money(jurosAnuais(EX_EURIBOR.saldo, EX_EURIBOR.indexador + 0.01, EX_EURIBOR.spread), '€')}.`,
      ],
      resultado: `Cada ponto percentual na Euribor muda o custo em ${money(jurosAnuais(EX_EURIBOR.saldo, 0.01, 0), '€')} ao ano neste saldo.`,
    },
    noApp: { texto: 'O app ainda não exibe a Euribor. Em Juros de referência aparece a taxa de depósito do BCE, que é o que a move.', tab: 'juros' },
    teste: {
      pergunta: 'Se o BCE sobe a taxa de depósito, o que tende a acontecer com a Euribor?',
      resposta: 'Tende a subir, porque os bancos passam a pagar mais pelo dinheiro e o mercado já antecipa as próximas decisões do BCE.',
    },
  },
  {
    id: 'custo-de-funding',
    topico: 'Funding e risco',
    nome: 'Custo de funding',
    frase: 'É quanto custa, em média, para uma instituição conseguir o dinheiro que depois empresta.',
    crianca: [
      'Uma padaria compra farinha para fazer pão: o preço da farinha é o custo dela. Um banco “compra” dinheiro de quem aplica (CDB, LCI, depósitos) ou de investidores de fora, e paga juros por isso.',
      'Esse custo médio é o custo de funding. Quando o banco empresta, cobra mais do que pagou, e a diferença é a margem.',
    ],
    analogia: 'É o preço da farinha do banco: quem capta mais barato consegue emprestar mais barato, ou lucrar mais.',
    lacunas: [
      'Não é uma taxa só. É uma média das fontes, ponderada pelo valor de cada uma.',
      'Muda com o risco da instituição e do país (ver CDS), com o prazo e com a moeda da captação.',
      '“Funding spread” é o custo acima de um benchmark, por exemplo CDI + 1,5% ao ano ou SOFR + 2%.',
    ],
    preciso: {
      texto: 'Custo médio ponderado das fontes de captação, mais custos que não aparecem na taxa (recolhimentos compulsórios, contribuição ao FGC, despesas de captação). Em dólar, costuma ser benchmark (SOFR) mais spread de crédito; para virar custo em reais, soma-se a conversão pelo cupom cambial (swap).',
      formula: 'custo médio = Σ (valor da fonte × custo da fonte) ÷ Σ valores',
    },
    exemplo: (() => {
      const c = custoMedio(EX_FUNDING.fontes.map(({ valor, custo }) => ({ valor, custo })))
      const total = EX_FUNDING.fontes.reduce((s, f) => s + f.valor, 0)
      return {
        titulo: 'Banco que capta 100',
        passos: [
          `Fontes: ${EX_FUNDING.fontes.map((f) => `${f.nome} ${f.valor} a ${pct(f.custo, 0)}`).join('; ')} (na prática, o capital próprio também tem custo de oportunidade).`,
          `Custo médio = (${EX_FUNDING.fontes.map((f) => `${f.valor}×${nf(f.custo * 100, 0)}%`).join(' + ')}) ÷ ${total} = ${pct(c, 1)} ao ano.`,
          `Se empresta a ${pct(EX_FUNDING.taxaEmprestimo, 0)} ao ano, a margem bruta é ${nf((EX_FUNDING.taxaEmprestimo - c) * 100, 1)} pontos percentuais, antes de impostos, inadimplência e custos.`,
        ],
        resultado: `Custo de funding de ${pct(c, 1)} ao ano e margem bruta de ${nf((EX_FUNDING.taxaEmprestimo - c) * 100, 1)} p.p.`,
      }
    })(),
    noApp: { texto: 'A curva DI, em Juros, é o benchmark em reais; o cupom cambial, na mesma aba, mostra o custo do dólar embutido nos juros.', tab: 'juros' },
    teste: {
      pergunta: 'Se o CDS do país sobe, o que tende a acontecer com o custo de funding externo de um banco brasileiro?',
      resposta: 'Tende a subir. O mercado passa a exigir um spread maior para financiar quem está no país percebido como mais arriscado.',
    },
  },
  {
    id: 'liquidacao-antecipada',
    topico: 'Operações de crédito',
    nome: 'Liquidação antecipada (na curva, a mercado e break funding)',
    frase: 'É pagar um contrato antes do vencimento; o valor a pagar muda conforme o contrato seja liquidado na curva ou a mercado, e pode vir com a cobrança de break funding.',
    crianca: [
      'Você financiou R$ 1 milhão a uma taxa fixa por dois anos e quer quitar com um ano de antecedência. Quanto pagar? Há duas formas de calcular.',
      'Na curva: o saldo cresce todo dia pela taxa contratada, como se o contrato seguisse normalmente, e você paga esse saldo. É a conta do contrato; não olha o que o mercado paga de juros hoje.',
      'A mercado: o contrato vale hoje o que vale o dinheiro que ele ainda vai render, descontado pela taxa de mercado do prazo que falta. Se o mercado paga menos do que o seu contrato, o contrato “vale mais” e você paga mais do que o saldo na curva; se o mercado paga mais, paga menos.',
      'Break funding (custo de quebra) é a indenização que o credor cobra por ter captado dinheiro a uma taxa e prazo fixos para emprestar a você: ao receber antes, ele só consegue reaplicar a uma taxa menor e fica com um buraco. A cláusula do contrato diz se e como isso é cobrado.',
    ],
    analogia: 'É como cancelar um aluguel antes do fim: o saldo contábil é o que falta pagar (na curva); o valor de mercado é o quanto o dono perde ou ganha se alugar de novo pelos preços de hoje; o break funding é a multa para cobrir o buraco que ele fica.',
    lacunas: [
      'Na curva não é “sem custo”: é o valor contábil. Quem liquida na curva um contrato que rende menos que o mercado paga pouco; quem liquida um que rende mais deixa o credor no prejuízo, e é aí que entra a cobrança de quebra.',
      'A mercado e break funding atacam o mesmo problema (a diferença entre a taxa do contrato e a taxa de hoje) por caminhos diferentes. Em geral, o contrato prevê um ou outro, ou fixa uma regra própria; somar os dois pelo mesmo efeito seria cobrar em dobro.',
      'Break funding mede a perda do credor com a captação (taxa de funding contra taxa de reaplicação), não a perda com o contrato (taxa do contrato contra taxa de mercado). Por isso nunca é negativo: se ele reaplica acima do funding, não há o que cobrar.',
      'Os termos e a fórmula exata dependem do contrato e da instituição (em operações do BNDES, das condições da linha); a conta abaixo é o esqueleto, não a cláusula.',
    ],
    preciso: {
      texto: 'Com taxa contratada i, prazo total T, tempo decorrido t, resto r = T − t, taxa de mercado m, taxa de funding f e taxa de reaplicação m (juros compostos anuais):',
      formula: 'curva = P × (1 + i)^t   ·   mercado = P × (1 + i)^T ÷ (1 + m)^r   ·   break funding = saldo do funding × [((1 + f) ÷ (1 + m))^r − 1], mínimo zero',
    },
    exemplo: (() => {
      const e = EX_LIQ
      const curva = valorNaCurva(e)
      const mercado = valorAMercado(e)
      const quebra = breakFunding({ captado: e.principal, taxaFunding: e.taxaFunding, anosDecorridos: e.anosDecorridos, taxaReaplicacao: e.taxaMercado, anosRestantes: e.anosRestantes })
      return {
        titulo: `Empréstimo de ${money(e.principal, 'R$')} a ${pct(e.taxa, 0)} ao ano, quitado com um ano de antecedência`,
        passos: [
          `Contrato prefixado de ${e.anosTotal} anos; liquidação após ${e.anosDecorridos} ano. A taxa de mercado para o ano que falta está em ${pct(e.taxaMercado, 0)}.`,
          `Na curva = ${nf(e.principal, 0)} × ${nf(1 + e.taxa, 2)}^${e.anosDecorridos} = R$ ${nf(curva, 0)}.`,
          `A mercado: no vencimento o contrato valeria R$ ${nf(e.principal * (1 + e.taxa) ** e.anosTotal, 0)}; trazido a valor presente por ${pct(e.taxaMercado, 0)} em ${e.anosRestantes} ano, dá R$ ${nf(mercado, 0)}, ou seja, R$ ${nf(mercado - curva, 0)} a mais que na curva, porque o contrato rende mais do que o mercado paga hoje.`,
          `Break funding: o credor captou ${money(e.principal, 'R$')} a ${pct(e.taxaFunding, 0)}, e a captação já vale R$ ${nf(e.principal * (1 + e.taxaFunding) ** e.anosDecorridos, 0)}. Reaplicando a ${pct(e.taxaMercado, 0)} em vez de ${pct(e.taxaFunding, 0)}, falta R$ ${nf(quebra, 0)} a valor presente.`,
        ],
        resultado: `Na curva R$ ${nf(curva, 0)}; a mercado R$ ${nf(mercado, 0)}; break funding de R$ ${nf(quebra, 0)} (só o que cobre a captação, conforme o contrato).`,
      }
    })(),
    noApp: { texto: 'A taxa de mercado do prazo que falta vem da curva DI x pré, em Juros; para a TFB e a TLP do BNDES, veja a aba BNDES e, em Cenários, o assunto Indexadores (TR, TBF e TLP).', tab: 'juros' },
    teste: {
      pergunta: 'A taxa de mercado cai de 12% para 8% depois que você contratou a 15% fixos. Liquidar na curva ou a mercado custa mais?',
      resposta: 'A mercado custa mais. O seu contrato rende 15% e o mercado paga 8%, então o valor presente dos fluxos que faltam sobe. Na curva o saldo não muda com a taxa de mercado, por isso é o menor dos dois.',
    },
  },
  {
    id: 'cds',
    topico: 'Funding e risco',
    nome: 'CDS (Credit Default Swap)',
    frase: 'É um seguro contra calote de uma empresa ou de um país; o preço do seguro mede o risco percebido.',
    crianca: [
      'Você empresta dinheiro a um amigo e compra um seguro: se ele não pagar, a seguradora cobre. O CDS é esse seguro, só que negociado no mercado.',
      'Quanto mais caro o prêmio por ano, mais o mercado teme o calote. O CDS de 5 anos do Brasil é o termômetro de risco-país mais citado.',
    ],
    analogia: 'É o preço do seguro de carro: carro em bairro perigoso paga mais. País ou empresa mais arriscados pagam mais.',
    lacunas: [
      'Não é um título nem um juro; é um derivativo. Quem compra paga um prêmio periódico e recebe indenização se houver evento de crédito (calote ou reestruturação).',
      'O número cotado (ex.: 200) é o prêmio em pontos-base ao ano sobre o valor protegido, não um rendimento.',
      'Não é igual ao EMBI, que mede a diferença de rendimento de títulos soberanos em dólar contra os Treasuries. São parentes, mas medidas diferentes.',
    ],
    preciso: {
      texto: 'Contrato padronizado (ISDA). O comprador da proteção paga o spread acordado sobre o nocional, em trimestres, até o vencimento ou até o evento de crédito. 100 pontos-base equivalem a 1% ao ano:',
      formula: 'prêmio anual = nocional × spread (pb) ÷ 10.000',
    },
    exemplo: {
      titulo: 'Quanto custa proteger',
      passos: [
        `CDS de 5 anos cotado a ${EX_CDS.pb} pb. Valor protegido: ${money(EX_CDS.nocional, 'US$')}.`,
        `Prêmio = ${nf(EX_CDS.nocional, 0)} × ${EX_CDS.pb} ÷ 10.000 = US$ ${nf(premioCds(EX_CDS.nocional, EX_CDS.pb), 0)} por ano.`,
      ],
      resultado: `${EX_CDS.pb} pb equivalem a ${pct(EX_CDS.pb / 10000)} ao ano do valor protegido.`,
    },
    noApp: { texto: 'O app não exibe CDS: a cotação exige fonte de mercado paga. Como referência indireta, veja o cupom cambial e os Treasuries em Juros.', tab: 'juros' },
    teste: {
      pergunta: 'O CDS de 5 anos do Brasil passa de 150 para 250 pb. O que isso diz?',
      resposta: 'O mercado passou a ver mais risco de crédito no país: proteger o mesmo valor ficou 100 pb (1 ponto percentual ao ano) mais caro.',
    },
  },
  {
    id: 'debenture',
    topico: 'Operações de crédito',
    nome: 'Debênture',
    frase: 'É um título de dívida que uma empresa emite para pegar dinheiro emprestado direto de investidores, em vez de pegar no banco.',
    crianca: [
      'Uma empresa precisa de R$ 100 milhões para uma obra. Em vez de um banco emprestar tudo, ela divide a dívida em muitos pedaços iguais (as debêntures) e vende cada um a um investidor. Quem compra empresta; a empresa promete devolver o valor e pagar juros.',
      'As regras ficam na escritura de emissão: prazo, remuneração (por exemplo CDI + 2% ao ano, IPCA + 7% ou taxa prefixada), datas de pagamento e garantias. Um agente fiduciário confere, em nome dos investidores, se a empresa cumpre o combinado.',
    ],
    analogia: 'É uma vaquinha formal: a empresa pede um pouco a muita gente, assina o que promete pagar e alguém independente (o agente fiduciário) confere se ela cumpre.',
    lacunas: [
      'Não é ação: o debenturista é credor, não sócio. Se a empresa quebrar, os credores recebem antes dos acionistas (existe a debênture conversível em ações, mas é um caso à parte).',
      'Renda fixa não é risco zero: o risco é o de crédito da empresa emissora, e a debênture não tem a garantia do FGC. Quanto maior o risco, maior o spread que o mercado exige.',
      'Na remuneração pós-fixada o spread compõe com o CDI: 14% de CDI com 2% de spread dão cerca de 16,3% ao ano, não 16%.',
      'Debêntures incentivadas (de infraestrutura) têm benefício fiscal para a pessoa física; a regra tributária muda por lei, então confira a vigente.',
      'O mercado secundário costuma ter menos liquidez que o de ações ou de títulos públicos: vender antes do vencimento pode custar um desconto.',
    ],
    preciso: {
      texto: 'Título de crédito emitido por sociedade por ações, em série, com os termos definidos na escritura de emissão. O preço unitário (PU) é o valor nominal atualizado mais a remuneração acumulada. Na remuneração pós-fixada, o spread compõe com o CDI do período:',
      formula: 'taxa efetiva = (1 + CDI) × (1 + spread) − 1   ·   juros = principal × [(1 + taxa)^t − 1]',
    },
    exemplo: (() => {
      const e = EX_DEB
      const taxa = taxaCdiMaisSpread(e.cdi, e.spread)
      return {
        titulo: `Investidor compra ${money(e.principal, 'R$')} em debêntures CDI + ${pct(e.spread, 0)}`,
        passos: [
          `CDI de ${pct(e.cdi, 0)} ao ano, mantido ao longo do ano (simplificação). Spread de ${pct(e.spread, 0)}.`,
          `Taxa efetiva = ${nf(1 + e.cdi, 2)} × ${nf(1 + e.spread, 2)} − 1 = ${pct(taxa)} ao ano (e não ${pct(e.cdi + e.spread, 0)}).`,
          `Juros em 1 ano = ${nf(e.principal, 0)} × ${pct(taxa)} = R$ ${nf(jurosNoPrazo({ principal: e.principal, taxaAnual: taxa, fracaoAno: 1 }), 0)}.`,
        ],
        resultado: `R$ ${nf(jurosNoPrazo({ principal: e.principal, taxaAnual: taxa, fracaoAno: 1 }), 0)} de juros em um ano, ${pct(taxa)} ao ano, antes de impostos e do risco de crédito.`,
      }
    })(),
    noApp: { texto: 'O app não traz preços nem emissões de debêntures. O CDI, referência da remuneração pós-fixada, está em Juros.', tab: 'juros' },
    teste: {
      pergunta: 'Uma debênture paga CDI + 2% ao ano e o CDI sobe de 14% para 15%. O que acontece com a remuneração?',
      resposta: `Sobe junto: de cerca de ${pct(taxaCdiMaisSpread(0.14, 0.02), 1)} para ${pct(taxaCdiMaisSpread(0.15, 0.02), 1)} ao ano. O spread de 2% continua o mesmo; só a parte do CDI muda.`,
    },
  },
  {
    id: 'nota-comercial',
    topico: 'Operações de crédito',
    nome: 'Nota comercial',
    frase: 'É um título de dívida de curto prazo que a empresa emite para captar dinheiro de investidores, mais simples e rápido de montar que a debênture.',
    crianca: [
      'Se a debênture é o empréstimo coletivo de prazo longo e formal, a nota comercial é a versão curta e enxuta: a empresa precisa de capital de giro por alguns meses, emite notas e investidores as compram.',
      'Como na debênture, há valor, prazo, data de pagamento e remuneração definidos (muitas vezes CDI + spread). Em geral há menos exigências e custo de emissão menor, o que a torna comum para capital de giro e para “pontes” até uma captação maior.',
    ],
    analogia: 'É um empréstimo-ponte com recibo: valor, prazo e juros no papel, mas sem toda a estrutura de uma debênture.',
    lacunas: [
      'Prazo curto não é segurança: o risco continua sendo o de crédito do emissor, e não há garantia do FGC.',
      'Prazo curto obriga a empresa a refinanciar logo: se o mercado fechar na hora do vencimento, o risco é o de refinanciamento.',
      'Na prática, as diferenças para a debênture são prazo (mais curto), formalização (mais enxuta) e uso (capital de giro, ponte). Ambas são dívida da empresa com remuneração definida.',
      'Quem pode emitir, prazos e forma de oferta vêm da lei e da regulamentação da CVM, e já mudaram: confira a norma vigente antes de decidir.',
    ],
    preciso: {
      texto: 'Título de crédito que representa promessa de pagamento em dinheiro, emitido por empresa, em geral com prazo curto e remuneração em taxa (prefixada ou pós-fixada). Os juros do prazo seguem o cálculo da debênture, com t em fração do ano (convenção do CDI: dias úteis ÷ 252):',
      formula: 'juros = principal × [(1 + taxa)^t − 1]   ·   t = dias úteis ÷ 252',
    },
    exemplo: (() => {
      const e = EX_NC
      const taxa = taxaCdiMaisSpread(e.cdi, e.spread)
      const t = e.diasUteis / 252
      const juros = jurosNoPrazo({ principal: e.principal, taxaAnual: taxa, fracaoAno: t })
      return {
        titulo: `Capital de giro de ${money(e.principal, 'R$')} por ${e.diasUteis} dias úteis`,
        passos: [
          `Remuneração CDI + ${pct(e.spread, 0)}, com CDI de ${pct(e.cdi, 0)}: taxa efetiva = ${nf(1 + e.cdi, 2)} × ${nf(1 + e.spread, 2)} − 1 = ${pct(taxa)} ao ano.`,
          `Prazo: ${e.diasUteis} ÷ 252 = ${nf(t, 2)} ano.`,
          `Juros = ${nf(e.principal, 0)} × [(1 + ${pct(taxa)})^${nf(t, 2)} − 1] = R$ ${nf(juros, 0)}, ou ${pct(juros / e.principal)} sobre o valor captado.`,
        ],
        resultado: `Em meio ano, a empresa paga R$ ${nf(juros, 0)} de juros (${pct(juros / e.principal)} do valor) além de devolver o principal.`,
      }
    })(),
    noApp: { texto: 'O app não traz emissões de notas comerciais. O CDI, referência da remuneração pós-fixada, está em Juros.', tab: 'juros' },
    teste: {
      pergunta: 'Por que uma empresa pode preferir uma nota comercial a uma debênture para cobrir uma necessidade de 6 meses?',
      resposta: 'Porque a emissão é mais simples e barata e o prazo é curto: não compensa montar a estrutura de uma debênture de longo prazo para uma necessidade passageira.',
    },
  },
  {
    id: 'fidc',
    topico: 'Operações de crédito',
    nome: 'FIDC (Fundo de Investimento em Direitos Creditórios)',
    frase: 'É um fundo que compra recebíveis (valores que empresas têm a receber) e financia a compra vendendo cotas a investidores.',
    crianca: [
      'Uma loja vende a prazo e só vai receber daqui a 60 dias, mas precisa do dinheiro hoje. Ela vende esses recebíveis ao FIDC com desconto. O fundo paga hoje e recebe dos clientes no vencimento.',
      'Para ter o dinheiro, o fundo vende cotas a investidores, em camadas: a cota sênior é paga primeiro; a subordinada (muitas vezes ficando com o próprio vendedor dos recebíveis) absorve as primeiras perdas e protege a sênior.',
    ],
    analogia: 'É um prédio com andares: a perda entra pelo porão (cota subordinada) e só sobe ao andar de cima (sênior) se o porão encher.',
    lacunas: [
      'O investidor sênior depende da qualidade da carteira de recebíveis e do tamanho da subordinação, não só de quem vendeu os recebíveis. Mas inadimplência acima da subordinação atinge a sênior.',
      'Mais subordinação protege mais a sênior, mas obriga o cedente a deixar mais capital no fundo; menos subordinação financia mais com dinheiro de terceiros e é mais arriscada.',
      'Não é coberto pelo FGC. A liquidez das cotas costuma ser limitada, com amortização e resgate previstos no regulamento do fundo.',
      'Quem pode investir (público geral ou só profissional) e as regras da carteira vêm da regulamentação da CVM e do regulamento de cada fundo: confira os dois.',
    ],
    preciso: {
      texto: 'Fundo cujo ativo são direitos creditórios (duplicatas, recebíveis de cartão, financiamentos, créditos corporativos etc.) e cujo passivo são cotas seniores, eventualmente mezanino, e subordinadas. A perda da carteira é absorvida primeiro pela cota subordinada. A proteção da sênior é medida pelo índice de subordinação:',
      formula: 'subordinação = subordinadas ÷ (sênior + subordinadas)   ·   perda na sênior = máx(0, perda − subordinadas)',
    },
    exemplo: (() => {
      const e = EX_FIDC
      const sub = indiceSubordinacao(e)
      const [a, b] = e.perdas.map((perda) => ({ perda, ...perdaNasCotas({ ...e, perda }) }))
      return {
        titulo: `FIDC com carteira de ${money(e.senior + e.subordinada, 'R$')}`,
        passos: [
          `Cotas: sênior ${money(e.senior, 'R$')} e subordinada ${money(e.subordinada, 'R$')}. Subordinação = ${nf(e.subordinada, 0)} ÷ ${nf(e.senior + e.subordinada, 0)} = ${pct(sub, 0)}.`,
          `Perda de ${money(a.perda, 'R$')} por inadimplência: a subordinada absorve tudo (${money(a.subordinada, 'R$')}) e fica com ${money(e.subordinada - a.subordinada, 'R$')}; a sênior perde ${money(a.senior, 'R$')}.`,
          `Perda de ${money(b.perda, 'R$')}: a subordinada zera (${money(b.subordinada, 'R$')}) e a sênior perde ${money(b.senior, 'R$')}.`,
        ],
        resultado: `Com ${pct(sub, 0)} de subordinação, a sênior só sofre perda quando a inadimplência passa de ${pct(sub, 0)} da carteira.`,
      }
    })(),
    noApp: { texto: 'O app não traz cotas de FIDC. Como referência de custo do crédito, veja o CDI e a curva DI em Juros.', tab: 'juros' },
    teste: {
      pergunta: 'Um FIDC tem 25% de subordinação e a carteira perde 30% por inadimplência. A cota sênior perde?',
      resposta: 'Perde, sim. A subordinada (25% da carteira) absorve os primeiros 25 pontos e os 5% restantes atingem a sênior.',
    },
  },
  {
    id: 'inflacao',
    topico: 'Inflação',
    nome: 'Inflação (IPCA)',
    frase: 'É o aumento generalizado e contínuo dos preços: o mesmo dinheiro compra menos com o tempo.',
    crianca: [
      'Se o lanche custava R$ 10 e hoje custa R$ 10,50, o preço subiu 5%. Se quase tudo sobe assim, mês após mês, há inflação, e o seu dinheiro perde poder de compra.',
      'No Brasil, a inflação oficial é o IPCA, medido pelo IBGE: acompanha o preço de uma cesta que representa o consumo das famílias (alimentos, transporte, moradia etc.). O Banco Central persegue uma meta para ele, hoje de 3,0% ao ano, com tolerância de 1,5 ponto percentual para cima ou para baixo.',
      'Para segurar a inflação, o Banco Central sobe a Selic: juro maior esfria o consumo e o crédito. Por isso Selic, curva de juros, câmbio e inflação andam juntos.',
    ],
    analogia: 'É o troco que encolhe: com os mesmos R$ 100 você compra hoje um pouco menos do que comprava no ano passado.',
    lacunas: [
      'Inflação é a variação dos preços, não o nível: inflação em queda não significa que os preços baixaram, só que sobem mais devagar. Preço só cai com deflação (inflação negativa).',
      'O acumulado em 12 meses é composto, não a soma dos meses: doze meses de 0,4% dão cerca de 4,9%, não 4,8%.',
      'Há mais de um índice: IPCA (oficial, usado na meta), INPC (famílias de menor renda) e IGP-M (FGV, usado em muitos reajustes de aluguel). Medem cestas diferentes e podem divergir.',
      'Juro nominal não é juro real: o que sobra para quem aplica é o juro descontada a inflação.',
    ],
    preciso: {
      texto: 'A inflação acumulada em n meses é o produto dos fatores mensais menos 1. O juro real, pela equação de Fisher, desconta a inflação do juro nominal:',
      formula: 'acumulado = Π (1 + mês) − 1   ·   juro real = (1 + nominal) ÷ (1 + inflação) − 1',
    },
    exemplo: (() => {
      const e = EX_INFL
      const acc = inflacaoAcumulada(Array(e.meses).fill(e.mensal))
      return {
        titulo: `${e.meses} meses de inflação a ${pct(e.mensal, 1)} ao mês`,
        passos: [
          `Soma simples (errada): ${e.meses} × ${pct(e.mensal, 1)} = ${pct(e.meses * e.mensal, 1)}.`,
          `Composto: (1 + ${nf(e.mensal, 3)})^${e.meses} − 1 = ${pct(acc)} em 12 meses.`,
          `Com a Selic a ${pct(e.selic)} ao ano, o juro real = ${nf(1 + e.selic, 3)} ÷ ${nf(1 + acc, 4)} − 1 = ${pct(juroReal(e.selic, acc))} ao ano.`,
        ],
        resultado: `Inflação de ${pct(acc)} em 12 meses e juro real de ${pct(juroReal(e.selic, acc))} ao ano sobre a Selic de ${pct(e.selic)}.`,
      }
    })(),
    noApp: { texto: 'O IPCA oficial, com histórico e o quadro “o que pesa”, está em Cenários › Outros.', tab: 'cenarios', view: 'outros' },
    teste: {
      pergunta: 'A inflação em 12 meses cai de 6% para 4%. Os preços caíram?',
      resposta: 'Não. Eles seguem subindo, mas a um ritmo menor: 4% ao ano em vez de 6%. Preço só cai quando há deflação, isto é, inflação negativa.',
    },
  },
  {
    id: 'commodities-e-cambio',
    topico: 'Commodities',
    nome: 'Commodities e câmbio',
    frase: 'As commodities são cotadas em dólar no mundo todo; quem produz ou compra em reais sente o preço pelo dólar multiplicado pelo câmbio.',
    crianca: [
      'Soja, petróleo, minério e café têm um preço de referência mundial, quase sempre em dólar. Mas o produtor brasileiro paga as contas e recebe em reais. Se o dólar sobe, os mesmos dólares valem mais reais.',
      'Por isso a soja pode ficar parada em dólar e mesmo assim render mais ao produtor: foi o dólar que subiu. O inverso também vale: com o real forte, o ganho em reais encolhe, ainda que o preço lá fora esteja estável.',
      'Dos dois lados do negócio: o exportador torce por dólar alto; o importador de fertilizante e de diesel, por dólar baixo. É por isso que câmbio e commodities andam sempre juntos nas conversas.',
    ],
    analogia: 'É como vender algo em moeda estrangeira numa viagem: o preço da etiqueta não mudou, mas o troco em reais depende da cotação do dia.',
    lacunas: [
      'O preço em reais mistura duas variáveis: a commodity em dólar e o câmbio. Uma pode subir enquanto a outra anula o efeito; olhe as duas antes de concluir.',
      'A referência internacional não é o preço que o produtor recebe: há prêmio de porto, frete, impostos e diferença de qualidade e de região.',
      'Fertilizantes e combustíveis são insumos importados: dólar alto encarece o custo do agro ao mesmo tempo em que valoriza a receita.',
    ],
    preciso: {
      texto: 'A conversão de uma commodity cotada em dólar por tonelada para real por saca de 60 kg usa o câmbio do período. Um mês de câmbio médio costuma ser usado para séries mensais:',
      formula: 'R$/saca = US$/tonelada × 0,06 × câmbio (R$/US$)',
    },
    exemplo: (() => {
      const e = EX_SACA
      const a = sacaEmReais(e.usd, e.antes), b = sacaEmReais(e.usd, e.depois)
      return {
        titulo: `Soja a US$ ${nf(e.usd, 0)}/t com o dólar a R$ ${nf(e.antes, 2)} e a R$ ${nf(e.depois, 2)}`,
        passos: [
          `Com o dólar a R$ ${nf(e.antes, 2)}: ${nf(e.usd, 0)} × 0,06 × ${nf(e.antes, 2)} = R$ ${nf(a, 2)} por saca.`,
          `Com o dólar a R$ ${nf(e.depois, 2)}: ${nf(e.usd, 0)} × 0,06 × ${nf(e.depois, 2)} = R$ ${nf(b, 2)} por saca.`,
          `O preço em dólar não mudou; a saca subiu ${pct(b / a - 1, 1)} em reais só pelo câmbio.`,
        ],
        resultado: `Mesma soja em dólar, ${pct(b / a - 1, 1)} a mais em reais: o câmbio responde sozinho por toda a diferença.`,
      }
    })(),
    noApp: { texto: 'A soja em dólar e a estimativa em R$/saca (dólar médio do mês) estão em Cenários › Commodities.', tab: 'cenarios', view: 'commodities' },
    teste: {
      pergunta: 'A soja cai 5% em dólar e o dólar sobe 10% no mesmo período. Em reais, a saca sobe ou cai?',
      resposta: 'Sobe, cerca de 4,5%: 0,95 × 1,10 = 1,045. O efeito do câmbio mais que compensou a queda lá fora.',
    },
  },
  {
    id: 'ic-br',
    topico: 'Commodities',
    nome: 'IC-Br (índice de commodities)',
    frase: 'É o índice do Banco Central que resume, em reais, o preço das commodities que mais pesam na economia brasileira.',
    crianca: [
      'Em vez de olhar soja, minério e petróleo um a um, o IC-Br junta tudo numa cesta com pesos que refletem o que o Brasil exporta, e acompanha o valor dessa cesta mês a mês.',
      'Ele vem em quatro partes: o índice geral, e as cestas de agropecuária, de metais e de energia. Assim dá para ver qual setor puxa o movimento.',
      'Como é calculado em reais, o índice mexe com dois fatores: o preço internacional das commodities e o câmbio. Dólar mais forte empurra o IC-Br para cima, ainda que o mundo esteja estável.',
    ],
    analogia: 'É o termômetro de uma cesta de compras do Brasil exportador: não diz o preço de cada produto, mas se a cesta inteira ficou mais cara ou mais barata.',
    lacunas: [
      'O IC-Br é um número-índice: o nível em si (por exemplo, 460) só tem sentido em comparação com meses anteriores. Olhe a variação.',
      'Ele é medido em reais; por isso reflete o câmbio. Para isolar o efeito do mundo, compare com as mesmas commodities em dólar.',
      'É mensal e divulgado com defasagem, ao contrário dos preços diários de petróleo e gás. Serve para tendência, não para acompanhar o dia.',
    ],
    preciso: {
      texto: 'O índice em reais é, em essência, o índice em dólar multiplicado pela variação do câmbio. A variação em reais combina as duas:',
      formula: 'variação em R$ = (1 + variação em US$) × (1 + variação do dólar) − 1',
    },
    exemplo: (() => {
      const e = EX_ICBR
      const v = (1 + e.quedaUsd) * (1 + e.altaDolar) - 1
      return {
        titulo: `Cesta cai ${pct(-e.quedaUsd, 0)} em dólar e o dólar sobe ${pct(e.altaDolar, 0)}`,
        passos: [
          `Em dólar: ${nf(e.indiceUsd, 2)} × (1 − ${nf(-e.quedaUsd, 2)}) = ${nf(e.indiceUsd * (1 + e.quedaUsd), 3)}.`,
          `Em reais, com o dólar ${pct(e.altaDolar, 0)} mais alto: ${nf(1 + e.quedaUsd, 2)} × ${nf(1 + e.altaDolar, 2)} − 1 = ${pct(v, 1)}.`,
        ],
        resultado: `O IC-Br sobe ${pct(v, 1)} mesmo com as commodities ${pct(-e.quedaUsd, 0)} mais baratas lá fora: o câmbio inverteu o sinal.`,
      }
    })(),
    noApp: { texto: 'O IC-Br geral, de agropecuária, metais e energia está em Cenários › Commodities, na tabela “Em reais”.', tab: 'cenarios', view: 'commodities' },
    teste: {
      pergunta: 'O IC-Br sobe 3% no mês. Isso quer dizer que as commodities ficaram 3% mais caras no mundo?',
      resposta: 'Não necessariamente. O índice é em reais: parte da alta pode vir só do dólar mais forte. Compare com a variação em dólar para separar os dois efeitos.',
    },
  },
  {
    id: 'combustiveis',
    topico: 'Commodities',
    nome: 'Combustíveis: do petróleo à bomba',
    frase: 'O preço na bomba parte do petróleo e dos derivados em dólar, passa pelo câmbio e ainda soma impostos, etanol, margens e frete.',
    crianca: [
      'O petróleo vira gasolina e diesel na refinaria. O valor dos derivados lá fora, em dólar por galão, é o ponto de partida do preço. Depois entram o câmbio, o frete, os tributos, a mistura de etanol na gasolina e as margens de distribuição e dos postos.',
      'Por isso o preço da bomba não acompanha o petróleo no mesmo dia: há política de preços da refinaria, estoques e contratos no meio do caminho. Uma alta lá fora chega à bomba com atraso e diluída.',
      'O diesel pesa muito além do carro: move caminhão e máquina agrícola, entra no frete de tudo e, por isso, aparece na inflação de forma indireta.',
    ],
    analogia: 'É como o preço de uma refeição: o ingrediente (derivado em dólar) é só uma parte da conta. O restante é cozinha, impostos e serviço.',
    lacunas: [
      'Converter o derivado de Nova York para reais por litro dá um piso de comparação, não o custo da refinaria brasileira: não inclui frete, impostos nem margens.',
      'A gasolina vendida no posto tem mistura de etanol anidro. Uma parte do preço depende do etanol e do açúcar, não do petróleo.',
      'O preço ao consumidor é uma média semanal de postos pesquisados pela ANP, com defasagem; já os derivados em Nova York são cotações diárias.',
    ],
    preciso: {
      texto: 'Para comparar o derivado americano com a bomba brasileira, converte-se o galão em litro e o dólar em real:',
      formula: 'R$/litro = (US$/galão ÷ 3,78541) × câmbio (R$/US$)',
    },
    exemplo: (() => {
      const e = EX_BOMBA
      const produto = galaoParaLitro(e.usdGalao, e.cambio)
      return {
        titulo: `Gasolina a US$ ${nf(e.usdGalao, 2)}/galão, dólar a R$ ${nf(e.cambio, 2)} e bomba a R$ ${nf(e.bomba, 2)}/litro`,
        passos: [
          `Em reais por litro: (${nf(e.usdGalao, 2)} ÷ 3,78541) × ${nf(e.cambio, 2)} = R$ ${nf(produto, 2)}.`,
          `Na bomba o litro custa R$ ${nf(e.bomba, 2)}: o produto convertido responde por ${pct(produto / e.bomba, 0)}.`,
          `O restante (${pct(1 - produto / e.bomba, 0)}) é imposto, etanol anidro na mistura, frete, distribuição e margem do posto.`,
        ],
        resultado: `Só ${pct(produto / e.bomba, 0)} do preço da bomba vem do derivado em dólar; por isso a gasolina reage menos que o petróleo.`,
      }
    })(),
    noApp: { texto: 'Gás, diesel e gasolina de Nova York estão na tabela de commodities; os preços ao consumidor (ANP), na tabela “Combustíveis ao consumidor”, ambas em Cenários › Commodities.', tab: 'cenarios', view: 'commodities' },
    teste: {
      pergunta: 'O petróleo sobe 10% em um dia. A gasolina na bomba sobe 10% no dia seguinte?',
      resposta: 'Em geral, não. Há política de preços, impostos, etanol, margens e defasagem no meio: a alta chega à bomba atrasada e menor do que 10%.',
    },
  },
]

export const TOPICOS = ['Juros e câmbio', 'Funding e risco', 'Operações de crédito', 'Inflação', 'Commodities']

// Busca por palavras (todas precisam aparecer), sem diferenciar acento nem maiúscula, no conteúdo inteiro do conceito.
const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const textoDeBusca = (c) => plain([c.nome, c.topico, c.frase, c.analogia, ...c.crianca, ...c.lacunas, c.preciso.texto, c.preciso.formula, c.exemplo.titulo, ...c.exemplo.passos, c.teste.pergunta, c.teste.resposta].join(' '))
export function buscarConceitos(termo, lista = CONCEITOS) {
  const palavras = plain(String(termo ?? '')).split(/\s+/).filter(Boolean)
  return palavras.length ? lista.filter((c) => { const t = textoDeBusca(c); return palavras.every((w) => t.includes(w)) }) : lista
}
// Agrupa por tópico, na ordem de TOPICOS, sem mostrar tópico vazio.
export const porTopico = (lista) => TOPICOS.map((topico) => ({ topico, itens: lista.filter((c) => c.topico === topico) })).filter((g) => g.itens.length)

// MAPA DE CONEXÕES. Regra do projeto: ao criar ou alterar um conceito, atualize aqui o papel dele (CONEXAO.itens) e as ligações com os
// outros conceitos (LIGACOES). Os testes recusam conceito sem papel, sem ligação ou com ligação para conceito que não existe.
// LIGACOES é a fonte única: cada par vale nos dois sentidos e aparece em "Conecta com" de ambos os conceitos e no quadro geral.
export const LIGACOES = [
  ['diferencial-de-juros', 'cupom-cambial', 'O cupom cambial é o diferencial de juros depois de passar pelo dólar futuro: a parte do juro em reais que sobra em dólar.'],
  ['diferencial-de-juros', 'sofr', 'A SOFR é o juro em dólar contra o qual se mede o diferencial: quanto maior o juro em reais sobre ela, maior o diferencial.'],
  ['diferencial-de-juros', 'inflacao', 'Diferencial nominal não é real: descontando a inflação de cada país, o ganho verdadeiro entre as moedas pode ser outro.'],
  ['cupom-cambial', 'sofr', 'O cupom cambial é o juro em dólar embutido no mercado brasileiro; a diferença dele para a SOFR mostra o prêmio de estar no país.'],
  ['cupom-cambial', 'custo-de-funding', 'O cupom cambial converte o custo de captar em dólar para reais (swap): é a ponte que fecha a conta do funding externo.'],
  ['sofr', 'euribor', 'São os benchmarks “sem risco” de cada moeda, dólar e euro, a base sobre a qual se soma o spread.'],
  ['sofr', 'custo-de-funding', 'Captar em dólar custa SOFR mais o spread de crédito de quem capta.'],
  ['euribor', 'custo-de-funding', 'Captar em euro custa Euribor mais o spread de crédito de quem capta.'],
  ['custo-de-funding', 'cds', 'O CDS mede o risco percebido: quando sobe, o spread exigido e o custo de funding sobem junto.'],
  ['custo-de-funding', 'liquidacao-antecipada', 'O break funding cobra o custo de quebrar a captação (funding) que financiava o contrato liquidado antes do prazo.'],
  ['custo-de-funding', 'debenture', 'A debênture é uma fonte de funding da empresa: seu custo é o CDI (ou o IPCA) mais o spread de risco.'],
  ['cds', 'debenture', 'O CDS é um seguro contra calote; o risco de crédito que ele precifica é o mesmo que define o spread da debênture.'],
  ['liquidacao-antecipada', 'debenture', 'Quitar ou resgatar uma debênture antes do vencimento pode ser na curva ou a mercado, e os contratos costumam prever uma cobrança de quebra.'],
  ['liquidacao-antecipada', 'fidc', 'Vender recebíveis ao FIDC com desconto é trazer valor futuro a valor presente, a mesma conta da liquidação a mercado.'],
  ['debenture', 'nota-comercial', 'Ambas são dívida da empresa com remuneração definida: a debênture é mais longa e formal, a nota comercial é curta e enxuta.'],
  ['debenture', 'fidc', 'Duas formas de captar no mercado: a debênture é dívida da empresa; o FIDC compra os recebíveis dela, e o investidor depende da carteira.'],
  ['debenture', 'inflacao', 'Debêntures indexadas ao IPCA pagam a inflação mais uma taxa real: quem compra se protege do aumento dos preços.'],
  ['commodities-e-cambio', 'ic-br', 'O IC-Br é o preço das commodities já passado pelo câmbio: o índice em reais é o índice em dólar multiplicado pelo dólar.'],
  ['commodities-e-cambio', 'combustiveis', 'O derivado cotado em dólar chega à bomba em reais: o câmbio converte o ponto de partida do preço do combustível.'],
  ['commodities-e-cambio', 'diferencial-de-juros', 'Um diferencial de juros alto tende a atrair dólares e valorizar o real, o que barateia em reais as commodities cotadas em dólar.'],
  ['ic-br', 'inflacao', 'Commodities agrícolas e de energia pressionam o IPCA com defasagem, por alimentos, combustíveis e insumos: o IC-Br antecipa parte dessa pressão.'],
  ['combustiveis', 'inflacao', 'Gasolina pesa diretamente no IPCA, e o diesel entra de forma indireta pelo frete de praticamente tudo.'],
  ['nota-comercial', 'fidc', 'Duas saídas para capital de giro: tomar dinheiro por pouco tempo (nota comercial) ou antecipar o que a empresa tem a receber (FIDC).'],
]

export const CONEXAO = {
  titulo: 'Como as peças se encaixam',
  itens: [
    { id: 'diferencial-de-juros', texto: 'é a distância entre o juro de duas moedas: a origem da conta que liga o real ao dólar.' },
    { id: 'cupom-cambial', texto: 'é a ponte entre o juro em reais e o juro em dólar.' },
    { id: 'sofr', texto: 'é o benchmark do dólar: o preço “sem risco” do dinheiro em dólar.' },
    { id: 'euribor', texto: 'é o benchmark do euro, o equivalente europeu da SOFR.' },
    { id: 'custo-de-funding', texto: 'é o resultado: benchmark + spread de risco, convertido na moeda em que a instituição empresta.' },
    { id: 'cds', texto: 'é o prêmio pelo risco de crédito: quanto mais alto, mais caro captar.' },
    { id: 'liquidacao-antecipada', texto: 'mostra quanto vale pagar antes do vencimento: o saldo do contrato (na curva), o preço de hoje (a mercado) e a indenização pelo funding quebrado (break funding).' },
    { id: 'debenture', texto: 'é a dívida longa e formal da empresa com investidores: CDI ou IPCA mais um spread.' },
    { id: 'nota-comercial', texto: 'é a dívida curta e enxuta da empresa, comum para capital de giro e ponte.' },
    { id: 'fidc', texto: 'é o fundo que compra recebíveis; a subordinação protege quem tem a cota sênior.' },
    { id: 'inflacao', texto: 'é o que desconta o juro nominal para chegar ao juro real, e o que o Banco Central tenta controlar com a Selic.' },
    { id: 'commodities-e-cambio', texto: 'é a regra de conversão: o preço mundial em dólar vira preço em reais pelo câmbio.' },
    { id: 'ic-br', texto: 'resume em reais a cesta de commodities do Brasil, mostrando se o conjunto ficou mais caro ou mais barato.' },
    { id: 'combustiveis', texto: 'é o caminho do derivado em dólar até a bomba, onde entram câmbio, impostos, etanol e margens, e de onde parte da inflação.' },
  ],
  // O caminho que une tudo, de ponta a ponta.
  cadeia: 'Inflação → Selic e curva DI → CDI → remuneração de debêntures e notas comerciais → custo de funding (somando o risco, medido pelo CDS) → liquidação antecipada e break funding. Na ponta externa, SOFR, Euribor, diferencial de juros e cupom cambial ligam o juro em reais ao juro em dólar e em euro. Nas commodities, o preço em dólar passa pelo câmbio e vira IC-Br, soja em reais e combustível na bomba, e daí volta à inflação.',
}

// Ligações de um conceito: [{ id, porque }] nos dois sentidos, na ordem de LIGACOES.
export const conexoesDe = (id) => LIGACOES.filter(([a, b]) => a === id || b === id).map(([a, b, porque]) => ({ id: a === id ? b : a, porque }))
