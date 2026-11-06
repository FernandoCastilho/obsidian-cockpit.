// Pesquisa histórica, não acompanhamento da política monetária atual.
// Fontes e limites documentais: docs/juros-forcados-historia.md.
import { nf } from './format.js'

const fonte = (nome, url) => ({ nome, url })
export const FONTES_JUROS = {
  fed: fonte('Federal Reserve History · Treasury–Fed Accord de 1951', 'https://www.federalreservehistory.org/essays/treasury-fed-accord'),
  fedCurva: fonte('Federal Reserve de Nova York · como a curva foi controlada nos anos 1940', 'https://libertystreeteconomics.newyorkfed.org/2020/04/how-the-fed-managed-the-treasury-yield-curve-in-the-1940s/'),
  repressao: fonte('Reinhart e Sbrancia · pesquisa original sobre repressão financeira (FMI, 2015)', 'https://www.imf.org/en/publications/wp/issues/2016/12/31/the-liquidation-of-government-debt-42610'),
  repressaoBis: fonte('Reinhart e Sbrancia · estudo original e mecanismos (BIS, 2011)', 'https://www.bis.org/publications/working-paper-363-liquidation-government-debt'),
  brasil2012: fonte('BCB · decisão do Copom de outubro de 2012', 'https://www.bcb.gov.br/controleinflacao/comunicadoscopom/15930'),
  brasilFmi: fonte('FMI · consulta do Artigo IV sobre o Brasil, publicada em abril de 2015', 'https://www.imf.org/en/news/articles/2015/09/14/01/49/pr15167'),
  brasil2015: fonte('BCB · decisão do Copom de julho de 2015', 'https://www.bcb.gov.br/controleinflacao/comunicadoscopom/15952'),
  brasilCarta: fonte('BCB · carta aberta sobre a inflação de 2015, de 08/01/2016 (PDF)', 'https://www.bcb.gov.br/content/monetarypolicy/openletters/carta2015.pdf'),
  japao2016: fonte('Banco do Japão · criação do controle da curva, 21/09/2016 (PDF)', 'https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2016/k160921a.pdf'),
  japao2022: fonte('Banco do Japão · ata de dezembro de 2022 e problemas no mercado de títulos', 'https://www.boj.or.jp/en/mopo/mpmsche_minu/minu_2022/g221220.htm'),
  japao2024: fonte('Banco do Japão · mudança do regime, 19/03/2024 (PDF)', 'https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2024/k240319a.pdf'),
  australia: fonte('RBA · revisão oficial do controle de rendimento, junho de 2022', 'https://www.rba.gov.au/monetary-policy/reviews/yield-target/'),
  turquia2021: fonte('Banco Central da Turquia · relatório anual de 2021', 'https://www3.tcmb.gov.tr/yillikrapor/2021/en/m-2-1.html'),
  turquiaFmi: fonte('FMI · avaliação da Turquia de 2022, publicada em agosto de 2023', 'https://www.imf.org/en/news/articles/2023/08/18/pr23289-turkiye-imf-executive-board-concluded-the-2022-article-iv-with-turkiye'),
  turquia2024: fonte('Banco Central da Turquia · relatório anual de 2024', 'https://www3.tcmb.gov.tr/yillikrapor/2024/en/m-2-1/'),
}

export const CASOS_JUROS = [
  {
    id: 'eua-guerra', pais: 'Estados Unidos', periodo: '1942–1951', tipo: 'Financiamento de guerra',
    chamada: 'O teto ajudou a financiar a guerra, mas entrou em conflito com o controle da inflação.',
    marcos: ['1942 · curto prazo em 0,375% a.a.; teto longo de 2,5% a.a.', '1951 · acordo entre Tesouro e Fed separou gestão da dívida e política monetária.'],
    contexto: 'Durante a Segunda Guerra Mundial, a prioridade era captar para o esforço de guerra a custo previsível. Em abril de 1942, o Fed assumiu o compromisso de sustentar juros baixos dos títulos do Tesouro.',
    mecanismo: 'Comprava títulos para defender a taxa. Ao garantir o preço necessário para manter o rendimento, perdia liberdade sobre o tamanho de sua carteira e a criação de reservas bancárias.',
    resultado: 'O financiamento ficou mais barato. Depois da guerra, a inflação ao consumidor alcançou 17,6% entre junho de 1946 e junho de 1947. A Guerra da Coreia intensificou o conflito: o Tesouro queria preservar os juros e o Fed queria conter a inflação. O acordo de março de 1951 abriu espaço para política monetária independente.',
    limite: 'A inflação não veio apenas do teto: o contexto incluía guerra, reconversão produtiva e retirada de controles de preços. A evidência é de incompatibilidade crescente entre defender a taxa e responder à inflação, não de uma causa única.',
    fontes: ['fed', 'fedCurva'],
  },
  {
    id: 'reino-unido-pos-guerra', pais: 'Reino Unido e outras economias', periodo: '1945–1980', tipo: 'Repressão financeira',
    chamada: 'A dívida pública encolheu em termos reais, com parte do custo absorvida pelos poupadores.',
    marcos: ['Pós-guerra · controles de capitais e demanda regulatória por dívida pública.', '1945–1980 · juros reais negativos foram frequentes na amostra histórica.'],
    contexto: 'No pós-guerra, vários governos carregavam dívidas elevadas. O Reino Unido é um dos casos examinados por Reinhart e Sbrancia em uma pesquisa histórica que inclui economias avançadas e emergentes.',
    mecanismo: 'Tetos de juros, regras de carteira e restrições à saída de capitais limitavam alternativas dos investidores. Com inflação acima do rendimento nominal, títulos públicos perdiam poder de compra: uma transferência dos credores para o devedor.',
    resultado: 'O estudo de 2015 estima economia média anual de juros de aproximadamente 1% a 5% do PIB entre os países de sua amostra de 12 economias, no período 1945–1980. É uma faixa entre países, não uma taxa exclusiva do Reino Unido nem um ganho de riqueza para toda a sociedade.',
    limite: 'É pesquisa dos autores, não recomendação oficial do FMI. Crescimento, resultados fiscais e outras mudanças também reduziram dívida/PIB. A redução da dívida não demonstra, sozinha, que o arranjo maximizou produtividade ou bem-estar.',
    fontes: ['repressao', 'repressaoBis'],
  },
  {
    id: 'brasil-2012', pais: 'Brasil', periodo: '2012–2015', tipo: 'Contraste: corte da Selic, não teto de toda a curva',
    chamada: 'A reversão dos juros ensina cautela, mas não prova que o corte de 2012 causou sozinho a crise.',
    marcos: ['10/10/2012 · Copom reduziu a Selic para 7,25% a.a.', 'Abril/2013 · começou o ciclo de alta.', '29/07/2015 · Selic foi elevada para 14,25% a.a.'],
    contexto: 'Em 2012, o Copom justificou o corte pelo balanço de riscos para a inflação, pela recuperação doméstica e pela complexidade do ambiente internacional. O registro oficial permite descrever a decisão, mas não basta para concluir que existia uma imposição política específica.',
    mecanismo: 'A autoridade reduziu a taxa básica. Não foi o mesmo instrumento dos tetos explícitos dos títulos americanos ou japoneses: juros longos, spreads e taxas bancárias não ficaram todos fixados em 7,25%.',
    resultado: 'A política foi revertida a partir de abril de 2013. Em 2015, a Selic chegou a 14,25% e o IPCA terminou o ano em 10,67%. A carta do BCB destacou reajustes de preços administrados e desvalorização cambial; o FMI também apontou deterioração fiscal, baixo investimento e perda de competitividade.',
    limite: 'São fatos simultâneos e uma sequência temporal, não uma estimativa do efeito isolado do corte. Reajustes de energia, câmbio, condições fiscais, choques externos e incerteza precisam entrar na explicação. Este caso é apresentado como contraste, não classificado automaticamente como repressão financeira.',
    fontes: ['brasil2012', 'brasilFmi', 'brasil2015', 'brasilCarta'],
  },
  {
    id: 'japao-ycc', pais: 'Japão', periodo: '2016–2024', tipo: 'Controle da curva para combater inflação baixa',
    chamada: 'Juros muito baixos duraram anos; os problemas apareceram também no funcionamento do mercado.',
    marcos: ['21/09/2016 · meta de cerca de 0% no título de 10 anos.', 'Dezembro/2022 · faixa ampliada para melhorar o mercado.', '19/03/2024 · encerramento do controle da curva e dos juros negativos.'],
    contexto: 'O Japão enfrentava inflação persistentemente baixa, em vez da inflação já muito alta da Turquia. O objetivo declarado do Banco do Japão era alcançar 2% de forma sustentada.',
    mecanismo: 'O banco manteve −0,1% sobre uma parcela das reservas bancárias e comprou títulos para aproximar o rendimento de 10 anos de zero. A política combinava controle da curva (YCC) e compromisso de expansão monetária.',
    resultado: 'A defesa dos rendimentos trouxe distorções: a ata de dezembro de 2022 discutiu perda de representatividade do título de 10 anos e piora da função de hedge. Em março de 2024, o banco encerrou YCC e juros negativos ao avaliar que a meta de inflação estava ao alcance de forma sustentável, mas manteve compras de títulos.',
    limite: 'Não houve a mesma trajetória de inflação da Turquia. A saída de 2024 foi justificada pelo avanço de salários e preços, não por hiperinflação. Isso não elimina custos do programa nem prova que manter juros baixos funciona em qualquer país.',
    fontes: ['japao2016', 'japao2022', 'japao2024'],
  },
  {
    id: 'australia-pandemia', pais: 'Austrália', periodo: '2020–2021', tipo: 'Controle de rendimento na pandemia',
    chamada: 'A política ajudou no choque inicial; manter a promessa durante a recuperação tornou a saída difícil.',
    marcos: ['19/03/2020 · meta de 0,25% no título de cerca de 3 anos.', 'Novembro/2020 · meta caiu para 0,10%.', '02/11/2021 · controle encerrado.'],
    contexto: 'No início da pandemia, o RBA buscava proteger emprego, crédito e estabilidade financeira diante do risco de uma recessão excepcional.',
    mecanismo: 'Compras de títulos e comunicação sustentavam uma meta de rendimento. O instrumento fazia parte de um pacote que também incluía redução da taxa básica e financiamento aos bancos.',
    resultado: 'A revisão oficial concluiu que o pacote, incluindo a meta, reduziu custos de captação e sustentou o crédito. Com recuperação e inflação superiores às esperadas, o controle perdeu aderência às expectativas. A saída foi desordenada, com volatilidade e dano reputacional reconhecidos pelo próprio RBA.',
    limite: 'O caso não é simplesmente um fracasso: há benefícios documentados na emergência e custos na saída. O RBA reconheceu que poderia ter retirado a meta mais cedo. O desafio era adaptar um compromisso rígido quando o cenário mudava.',
    fontes: ['australia'],
  },
  {
    id: 'turquia-cortes', pais: 'Turquia', periodo: '2021–2024', tipo: 'Cortes apesar de inflação elevada',
    chamada: 'O estímulo sustentou atividade, mas agravou câmbio e inflação e foi seguido de forte aperto.',
    marcos: ['Setembro–dezembro/2021 · taxa básica caiu de 19% para 14%.', 'Outubro/2022 · inflação em 12 meses chegou a cerca de 85%.', 'Março/2024 · taxa básica chegou a 50%.'],
    contexto: 'A economia se recuperava da pandemia e a inflação já estava muito acima da meta. Mesmo assim, a estratégia combinou juros baixos, direcionamento do crédito e incentivos para manter recursos em liras.',
    mecanismo: 'Os cortes reduziram a remuneração relativa da moeda doméstica. A pressão sobre a lira levou a intervenções cambiais e depósitos protegidos da desvalorização. O FMI relacionou o desenho da política à piora das vulnerabilidades.',
    resultado: 'A recuperação da atividade coexistiu com forte pressão cambial e inflação de aproximadamente 85% em outubro de 2022. A orientação mudou em junho de 2023; os juros chegaram a 50% em março de 2024. A inflação ainda encerrou 2024 em 44,4%, mostrando que estabilizar não é instantâneo.',
    limite: 'A guerra na Ucrânia e preços internacionais também agravaram o ambiente. O FMI, porém, identificou contribuição específica dos cortes para a pressão cambial. Crescimento no curto prazo não mede sozinho o custo para renda real, poupadores e estabilidade.',
    fontes: ['turquia2021', 'turquiaFmi', 'turquia2024'],
  },
]

const EXEMPLO = { nominal: 0.05, inflacao: 0.1, capital: 1000 }
export const exemploJuroForcado = ({ nominal, inflacao, capital }) => ({
  saldoNominal: capital * (1 + nominal),
  saldoReal: capital * (1 + nominal) / (1 + inflacao),
  taxaReal: (1 + nominal) / (1 + inflacao) - 1,
})
const ex = exemploJuroForcado(EXEMPLO)

export const CONCEITO_JUROS_FORCADOS = {
  id: 'juros-forcados',
  topico: 'Juros e câmbio',
  nome: 'Controle forçado de juros: história dos países',
  frase: 'Segurar a taxa pode aliviar o crédito hoje, mas o resultado depende da inflação, do câmbio, das contas públicas e de como a política termina.',
  revisadoEm: '2026-11-06',
  ajuda: ['Estudo histórico com episódios encerrados até 2024. Datas de revisão não tornam essas taxas atuais.', '“Forçado” é o ponto de partida da pergunta, não uma classificação técnica única. O estudo separa instrumentos e contextos antes de comparar resultados.'],
  crianca: [
    'Juro é o preço de usar dinheiro por um período. O banco central normalmente influencia esse preço. O problema não é simplesmente o governo participar, mas manter uma condição que conflita com a estabilidade que pretende alcançar.',
    'Há coisas diferentes: reduzir a taxa básica; comprar títulos para limitar os juros de um prazo; tabelar a taxa dos empréstimos; ou criar regras que empurrem a poupança para dívida pública. Não trate todos esses mecanismos como iguais.',
    'A história reúne alívio temporário, perda de poder de compra, pressão cambial, distorções de mercado e saídas difíceis. Estados Unidos, Reino Unido, Brasil, Japão, Austrália e Turquia ajudam a comparar por que os resultados mudaram.',
  ],
  analogia: 'É como controlar a velocidade de uma esteira. Reduzi-la pode ser adequado se a produção parou, mas insistir no mesmo ajuste depois que a fábrica muda cria filas em outros pontos. É preciso olhar o sistema inteiro, não só o botão.',
  lacunas: [
    'Juro baixo não é automaticamente artificial. Com inflação e demanda fracas, pode ser coerente com o objetivo de estabilizar a economia.',
    'Taxa básica não é toda a curva: o juro longo e o spread de crédito podem subir mesmo quando o banco central corta o curto.',
    'Juro real esperado usa inflação esperada para o mesmo prazo. Descontar a inflação já ocorrida mede o resultado passado, não a atratividade futura completa.',
    'Teto de empréstimo é outro instrumento: se ficar abaixo do custo e do risco, pode reduzir a oferta ou mudar a seleção dos clientes. Os casos abaixo não são todos exemplos desse tabelamento.',
    'Não atribua toda inflação, recessão ou desvalorização a uma única decisão. Guerra, oferta, contas públicas, produtividade, expectativas e desenho institucional também importam.',
  ],
  preciso: {
    texto: 'Controle da curva fixa um objetivo para rendimentos de títulos e usa operações para defendê-lo. Repressão financeira combina restrições e incentivos que reduzem o retorno dos poupadores ou criam demanda cativa por dívida. Dominância fiscal é a limitação da política monetária pelas necessidades e pela sustentabilidade fiscal; não é sinônimo de qualquer redução de juros. A taxa real deve comparar rendimento e inflação do mesmo período.',
    formula: 'juro real = (1 + juro nominal) ÷ (1 + inflação) − 1',
  },
  exemplo: {
    titulo: 'ganhar no extrato e perder poder de compra (valores fictícios)',
    passos: [
      `Uma aplicação de R$ ${nf(EXEMPLO.capital, 2)} rende ${nf(EXEMPLO.nominal * 100, 0)}% em um ano: saldo de R$ ${nf(ex.saldoNominal, 2)}, antes de impostos e custos.`,
      `Com inflação de ${nf(EXEMPLO.inflacao * 100, 0)}% no mesmo ano, o saldo vale R$ ${nf(ex.saldoReal, 2)} em poder de compra inicial.`,
      `Retorno real: (1,05 ÷ 1,10 − 1) × 100 = ${nf(ex.taxaReal * 100, 2)}%. Subtrair 10% de 5% daria apenas uma aproximação.`,
    ],
    resultado: 'O saldo nominal cresce, mas compra menos. Esse efeito pode reduzir o peso real de dívida prefixada; não vale da mesma forma para dívida corrigida pela inflação ou pelo câmbio.',
  },
  estudoHistorico: {
    titulo: 'Seis histórias, mecanismos diferentes',
    escopo: 'Recorte histórico de 1942 a 2024, com fontes consultadas em 06/11/2026. Não é previsão nem descrição das taxas vigentes. Abra cada caso para ver contexto, mecanismo, resultado e limites da comparação.',
    casos: CASOS_JUROS,
    comparacao: [
      { titulo: 'O ponto de partida muda tudo', texto: 'Japão partiu de inflação baixa; a Turquia cortou com inflação elevada. O mesmo número nominal pode significar condições monetárias muito diferentes.' },
      { titulo: 'O benefício tem um destinatário', texto: 'Na guerra, o foco foi financiar o Estado; na pandemia, sustentar crédito e emprego. Na repressão financeira, parte do alívio do devedor corresponde a perda real do credor.' },
      { titulo: 'A saída faz parte da política', texto: 'A Austrália documentou custos de abandonar uma promessa rígida. O Japão ajustou o mecanismo ao longo do tempo. Definir condições de saída é tão importante quanto anunciar a taxa.' },
      { titulo: 'Causalidade exige mais que antes e depois', texto: 'Estas histórias mostram mecanismos plausíveis e avaliações das fontes. Não isolam uma taxa de juros ideal nem fornecem uma estimativa causal comparável entre países.' },
    ],
    checklist: [
      'Qual taxa está sendo segurada: básica, rendimento de um título ou preço do crédito?',
      'A inflação esperada e os salários estão convergindo para a meta ou se afastando dela?',
      'O juro longo, os spreads e o câmbio confirmam a melhora ou estão cobrando mais risco?',
      'Há compras de títulos, perda de reservas, garantias cambiais ou regras criando compradores cativos?',
      'Quem recebe o crédito barato e quem absorve o custo: poupador, banco, contribuinte ou tomador excluído?',
      'Qual é a regra de saída? O caixa da empresa suporta juros maiores, moeda depreciada e refinanciamento mais caro?',
    ],
    conclusao: 'A história não sustenta que “juros baixos sempre dão errado”, nem que basta decretá-los para gerar prosperidade. O risco aumenta quando a taxa é mantida apesar da inflação, das restrições fiscais e da perda de confiança, sem plano de saída crível. Esta é uma síntese analítica dos casos, não uma regra mecânica de previsão.',
  },
  fontes: Object.entries(FONTES_JUROS).map(([id, item]) => ({ id, ...item })),
  noApp: { texto: 'Compare a taxa curta com a curva de juros e o custo de funding; não use um episódio histórico como cotação ou recomendação de investimento.', tab: 'juros' },
  teste: { pergunta: 'Por que Japão e Turquia não permitem concluir que todo juro baixo produz o mesmo resultado?', resposta: 'Porque inflação inicial, expectativas, moeda, instituições e instrumento eram diferentes. O Japão buscava superar inflação baixa; a Turquia cortou mesmo com inflação elevada. Avalie também os outros choques, quem financiou o alívio e como a política foi encerrada.' },
}
