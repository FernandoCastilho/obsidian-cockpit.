// Explicações curtas (método Feynman: frase simples, exemplo concreto, uso na mesa). Textos fixos, sem dados ao vivo.
// a = o que é, em palavras do dia a dia; b = exemplo com números redondos; c = como isso ajuda na decisão.
export const GLOSSARY = {
  cotacao: {
    t: 'Cotação',
    a: 'Quanto custa 1 unidade da moeda estrangeira, em reais.',
    b: 'Dólar a R$ 5,00: com R$ 5,00 você compra US$ 1. A seta mostra se está mais caro (▲) ou mais barato (▼) que no fechamento anterior.',
    c: 'Dólar subindo encarece importação e dívida em dólar; ajuda quem exporta.',
  },
  minigrafico: {
    t: 'Minigráfico e período',
    a: 'Um desenho do caminho do preço no período escolhido (Dia, Semana, Mês ou Ano).',
    b: 'Em "Mês", a linha mostra os últimos 30 dias; o % ao lado é quanto o preço mudou entre o primeiro e o último ponto.',
    c: 'Serve para ver direção e ritmo, não o valor exato. Para o valor de uma data, abra o gráfico.',
  },
  historico: {
    t: 'Gráfico de histórico',
    a: 'O preço de fechamento de cada dia, ligado por uma linha.',
    b: 'Se a linha sobe da esquerda para a direita, a moeda ficou mais cara em reais naquele período. Passe o mouse (ou o dedo) para ver a data e o valor.',
    c: 'Mostra se o preço de hoje é alto ou baixo comparado ao que foi nas últimas semanas.',
  },
  paridade: {
    t: 'Paridade EUR/USD',
    a: 'Quantos dólares são necessários para comprar 1 euro.',
    b: 'EUR/USD em 1,12: 1 euro vale US$ 1,12. Se sobe, o euro está se fortalecendo frente ao dólar.',
    c: 'Mostra a força do dólar no mundo, que influencia também o real. Aqui é calculada a partir do dólar e do euro em reais.',
  },
  variacao: {
    t: 'Variação e volatilidade',
    a: 'Variação é quanto o preço mudou (semana, mês, ano). Volatilidade é o quanto ele balança de um dia para o outro.',
    b: 'Vol. de 10% ao ano: balanço pequeno. 20% ou mais: o preço anda bem mais forte, para os dois lados.',
    c: 'Volatilidade alta pede mais cuidado em proteção (hedge) e em prazos; ela não diz se o preço vai subir ou cair.',
  },
  selic: {
    t: 'Selic',
    a: 'A taxa básica de juros do Brasil, definida pelo Copom a cada ~6 semanas. É o preço do dinheiro no país.',
    b: 'A 10% ao ano, R$ 100 emprestados rendem R$ 10 em um ano. A Selic é a referência para quase todos os outros juros.',
    c: 'Selic alta encarece crédito e atrai capital de fora, o que tende a segurar o dólar. Muda por degraus, só nas reuniões.',
  },
  cdi: {
    t: 'CDI',
    a: 'A taxa dos empréstimos de 1 dia entre bancos. Anda colada na Selic, um pouco abaixo.',
    b: 'Um CDB que paga "100% do CDI" rende o mesmo que o CDI. Se o CDI é 10% ao ano, rende ~10%.',
    c: 'É a régua da renda fixa no Brasil: tudo que rende em reais é comparado a ele.',
  },
  sofr: {
    t: 'SOFR',
    a: 'O "CDI americano": a taxa de empréstimos de 1 dia em dólares, com garantia de títulos do Tesouro dos EUA.',
    b: 'Dívidas em dólar costumam ser "SOFR + spread". Se a SOFR é 4% e o spread 2%, o juro é ~6%.',
    c: 'A diferença Selic − SOFR mostra quanto o Brasil paga a mais que os EUA; é parte da atração do real.',
  },
  sofrMedia: {
    t: 'Médias da SOFR',
    a: 'A média da SOFR dos últimos 30, 90 ou 180 dias, com os juros compostos.',
    b: 'A taxa do dia pode saltar no fim do mês; a média de 30 dias alisa esses pulos.',
    c: 'Mostra a tendência de fundo, sem o ruído de um dia.',
  },
  di1: {
    t: 'DI de 1 ano',
    a: 'A taxa que o mercado cobra hoje para emprestar em reais por 1 ano, negociada na B3.',
    b: 'Se a Selic é 15% e o DI de 1 ano é 13,9%, o mercado aposta que os juros vão cair nos próximos meses.',
    c: 'Acima da Selic: o mercado espera juros mais altos. Abaixo: espera cortes.',
  },
  ust10: {
    t: 'Treasury de 10 anos',
    a: 'O juro que o governo dos EUA paga para pegar dinheiro emprestado por 10 anos.',
    b: 'É considerado o investimento "sem risco" do mundo. Se paga 5%, qualquer outro ativo precisa pagar mais para compensar o risco.',
    c: 'Quando sobe, o dólar costuma se fortalecer e os países emergentes sofrem; quando cai, o contrário.',
  },
  curvaDi: {
    t: 'Curva de juros (DI x pré)',
    a: 'Um retrato das taxas para cada prazo: 3 meses, 1 ano, 5 anos. Cada ponto é o juro que o mercado cobra até aquela data.',
    b: 'Se a curva desce para a direita, o mercado aposta que os juros vão cair. Se sobe, aposta em alta ou em mais risco.',
    c: 'Ligue as datas na legenda: o desvio entre a linha de hoje e a de 1 mês atrás mostra como a aposta mudou.',
  },
  cupom: {
    t: 'Cupom cambial',
    a: 'O juro em dólar embutido nos contratos brasileiros: quanto se ganha em dólar por deixar dinheiro no Brasil.',
    b: 'Se a curva em reais paga 14% e o dólar deve subir 4%, o cupom é ~10%: o que sobra em dólar.',
    c: 'Sobe quando há muita procura por dólar no mercado local; é um termômetro do aperto de dólar.',
  },
  treasuries: {
    t: 'Curva do Tesouro dos EUA',
    a: 'Os juros dos títulos do governo americano para cada prazo, de 1 mês a 30 anos.',
    b: 'Normalmente prazos longos pagam mais. Quando os curtos pagam mais (curva invertida), o mercado costuma ver desaceleração à frente.',
    c: 'É a base de preço de todo o crédito em dólar no mundo.',
  },
  cdiFuturo: {
    t: 'CDI futuro',
    a: 'O CDI que o mercado já embutiu nos preços para períodos à frente, calculado a partir da curva do DI.',
    b: 'Se o CDI de hoje é 14,9% e o "a termo" para daqui a 1 ano é 13,5%, o mercado aposta em queda de juros. "Médio até lá" é a média do caminho todo; "no trecho" é só aquele pedaço.',
    c: 'Não é previsão oficial: inclui um prêmio de risco. Compare com o Focus para ver onde mercado e analistas divergem.',
  },
  focus: {
    t: 'Boletim Focus',
    a: 'Pesquisa semanal do Banco Central com bancos e consultorias sobre Selic, inflação, PIB e câmbio.',
    b: 'Cada número é a mediana: metade dos analistas espera mais, metade espera menos.',
    c: 'É a "opinião" do mercado. Se diverge do DI, vale perguntar quem está certo.',
  },
  projecoes: {
    t: 'Projeções do Itaú BBA',
    a: 'O cenário-base do Itaú BBA para as principais variáveis.',
    b: 'É a visão de uma instituição, não a média do mercado (essa é o Focus).',
    c: 'Use como uma referência a mais, com a data da revisão em mente.',
  },
  agenda: {
    t: 'Agenda de mercado',
    a: 'Os eventos que costumam mexer nos preços: decisões de juros (Copom, FOMC), inflação (IPCA), emprego (payroll) e o Focus.',
    b: 'No dia da decisão de juros, o dólar e o DI costumam se mexer mais na hora do anúncio. Horários em Brasília.',
    c: 'Ajuda a evitar surpresa: antes de fechar uma operação, veja se há evento próximo.',
  },
  noticias: {
    t: 'Notícias e tickers',
    a: 'Manchetes em ordem de horário. O ticker (USD, EUR, JPY, CNH) mostra a moeda ligada ao assunto.',
    b: 'Uma notícia sobre o Fed leva o ticker USD. Se tem dois tickers, vale para as duas moedas.',
    c: 'O ticker indica o tema, não a direção do preço. As manchetes em inglês são traduzidas automaticamente.',
  },
  faixaJuros: {
    t: 'Faixa de juros',
    a: 'Os juros-chave passando em fila: Selic, CDI, SOFR, DI de 1 ano e Treasury de 10 anos.',
    b: '"+2 bps" = subiu 0,02 ponto percentual desde o pregão anterior (100 bps = 1 ponto percentual). Passe o mouse para pausar.',
    c: 'Toque para abrir a aba Juros: lá cada indicador e gráfico tem o seu "?" com a explicação completa.',
  },
}
