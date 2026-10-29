// Aba "Aprender": conceitos explicados em linguagem simples. Os números dos exemplos saem das funções abaixo (testadas),
// nunca digitados no texto, para a tela não mostrar uma conta errada. Exemplos são didáticos, não cotações de mercado.

const nf = (v, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

// Paridade coberta de juros: (1 + i_BRL) = (1 + i_USD) × F / S  →  i_USD = (1 + i_BRL) × S / F − 1 (taxas anuais compostas, para o exemplo).
export const cupomCambial = ({ spot, futuro, di }) => ((1 + di) * spot) / futuro - 1

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

const EX_CUPOM = { spot: 5, futuro: 5.5, di: 0.14 }
const EX_CUPOM_2 = { spot: 5, futuro: 5.25, di: 0.14 }
const EX_SOFR = { principal: 1_000_000, taxa: 0.043 }
const EX_EURIBOR = { saldo: 200_000, indexador: 0.03, spread: 0.01 }
const EX_FUNDING = { fontes: [{ nome: 'CDB', valor: 60, custo: 0.14 }, { nome: 'LCI', valor: 30, custo: 0.13 }, { nome: 'Capital próprio', valor: 10, custo: 0 }], taxaEmprestimo: 0.18 }
const EX_CDS = { nocional: 10_000_000, pb: 200 }

const money = (v, sym) => `${sym} ${nf(v, 0)}`
const pct = (f, d = 2) => `${nf(f * 100, d)}%`

export const CONCEITOS = [
  {
    id: 'cupom-cambial',
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
    id: 'cds',
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
]

export const CONEXAO = {
  titulo: 'Como as peças se encaixam',
  itens: [
    ['SOFR e Euribor', 'são os benchmarks de cada moeda: o preço “sem risco” do dinheiro em dólar e em euro.'],
    ['CDS', 'é o prêmio pelo risco de crédito: quanto mais alto, mais caro captar.'],
    ['Cupom cambial', 'é a ponte entre o juro em reais e o juro em dólar.'],
    ['Custo de funding', 'é o resultado: benchmark + spread de risco, convertido na moeda em que a instituição empresta.'],
  ],
}

