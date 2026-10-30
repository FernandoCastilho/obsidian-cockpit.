// Explicação de cada evento do calendário econômico: o que é, o efeito na economia e a ligação com o Brasil.
// O texto é fixo e escolhido pelo título do evento (inglês do Forex Factory ou português das fontes oficiais).
// Evento sem categoria mapeada não inventa explicação: é tratado como de impacto baixo.

// Canal de transmissão por país: por onde o evento chega ao Brasil.
export const LIGACAO_PAIS = {
  BR: 'Evento doméstico: mexe direto com os juros futuros (DI), o câmbio e a bolsa.',
  US: 'EUA: dita o juro e o dólar globais; dólar forte e Treasuries em alta pressionam real, bolsa e fluxo para emergentes.',
  CN: 'China: maior compradora de minério, soja e petróleo do Brasil; dados fortes sustentam exportações e o real.',
  EU: 'Zona do euro: o euro pesa no índice do dólar e a região é grande parceira comercial; efeito mais indireto, via dólar e apetite a risco.',
  GB: 'Reino Unido: efeito indireto, pelo apetite a risco global e pelo dólar.',
  JP: 'Japão: juro baixo financia o carry trade; alta do juro ou do iene tira dinheiro de emergentes, o Brasil incluído.',
  AU: 'Austrália: economia ligada a minério; serve de termômetro de commodities e da demanda chinesa.',
  CA: 'Canadá: economia ligada a petróleo; efeito indireto, via preço de commodities.',
  CH: 'Suíça: o franco é porto seguro; sinaliza aversão a risco, que costuma pesar sobre o real.',
  NZ: 'Nova Zelândia: efeito indireto, via apetite a risco e commodities agrícolas.',
}

// ordem importa: a primeira categoria que casa vale
export const CATEGORIAS = [
  { id: 'feriado', re: /holiday|feriado/i,
    nome: 'Feriado bancário', oque: 'Dia em que o mercado do país fecha ou opera com horário reduzido.',
    economia: 'Menos liquidez: negócios mais raros e movimentos de preço mais bruscos nas moedas do país.', brasil: 'Se o feriado é nos EUA, o dólar e os juros futuros negociam no Brasil com volume menor.' },
  { id: 'fala', re: /minutes|\bata\b|speaks|speech|testif|discurso|fala\b/i,
    nome: 'Ata ou discurso de autoridade', oque: 'Detalha como o banco central pensa e o que debateu na última reunião.',
    economia: 'Muda as apostas de juros futuros antes da próxima decisão, sem alterar a taxa vigente.', brasil: 'Move Treasuries e dólar na hora; o DI brasileiro costuma seguir, por contágio.' },
  { id: 'juros', re: /fomc|copom|funds rate|refinancing rate|rate decision|policy rate|cash rate|overnight rate|bank rate|monetary policy|press conference|rate statement|interest rate|decisão|selic|deposit facility|\bsnb\b/i,
    nome: 'Decisão de juros', oque: 'O banco central define a taxa básica de juros e explica os próximos passos.',
    economia: 'Juro mais alto encarece crédito e esfria a atividade e a inflação; mais baixo estimula. O tom do comunicado pesa tanto quanto o número.', brasil: 'Juro maior lá fora atrai capital dos emergentes: dólar sobe, curva DI abre e a bolsa sofre; o inverso alivia.' },
  { id: 'emprego', re: /payroll|non-?farm|employment|unemployment|jobless|jolts|job openings|earnings|labou?r|caged|desemprego|vagas/i,
    nome: 'Emprego e salários', oque: 'Mede quantos empregos surgiram, a taxa de desemprego e o crescimento dos salários.',
    economia: 'Mercado de trabalho forte sustenta consumo e salários, o que pressiona a inflação e adia cortes de juros.', brasil: 'Dado forte nos EUA eleva Treasuries e dólar; o real e a bolsa tendem a perder.' },
  { id: 'inflacao-produtor', re: /\bppi\b|producer price|import price|wholesale|produtor|preços de importação/i,
    nome: 'Preços ao produtor e importação', oque: 'Mede a variação de custos na porta da fábrica, antes de chegar ao consumidor.',
    economia: 'Antecipa a inflação ao consumidor: custo alto de produção tende a ser repassado aos preços.', brasil: 'Indica pressão de preços global; pesa nas apostas de juros e no câmbio.' },
  { id: 'inflacao', re: /\bcpi\b|ipca|inflation|\bpce\b|hicp|consumer price|inflação|\bigp/i,
    nome: 'Inflação ao consumidor', oque: 'Mede a variação dos preços que as famílias pagam. É o dado que mais guia a decisão de juros.',
    economia: 'Inflação acima do esperado antecipa juros altos por mais tempo; abaixo, abre espaço para cortes.', brasil: 'Surpresa de alta lá fora fortalece o dólar e abre a curva de juros; no Brasil, o IPCA move DI, Selic esperada e câmbio.' },
  { id: 'pib', re: /\bgdp\b|\bpib\b|produto interno/i,
    nome: 'PIB', oque: 'Soma tudo o que a economia produziu no trimestre: o retrato da atividade.',
    economia: 'Crescimento forte sustenta lucros e emprego; queda seguida de dois trimestres caracteriza recessão técnica.', brasil: 'Crescimento global forte ajuda commodities e exportações; o PIB brasileiro mexe com juros e bolsa.' },
  { id: 'pmi', re: /pmi|\bism\b|\bifo\b|\bzew\b|sentiment|confidence|tankan|empire state|philly|business climate|sentix|confiança|\bnahb\b/i,
    nome: 'Atividade e confiança (PMI, sondagens)', oque: 'Pesquisas com empresas e consumidores; adiantam o rumo da economia. PMI acima de 50 indica expansão.',
    economia: 'Costumam virar antes do PIB: queda sinaliza desaceleração à frente; alta, retomada.', brasil: 'PMI industrial forte (China, EUA) anima commodities e o real; fraco derruba minério e bolsa.' },
  { id: 'atividade', re: /retail sales|industrial|durable|factory|production|vendas no varejo|produção|personal (income|spending)|consumer spending|\bpmc\b|\bpim\b/i,
    nome: 'Consumo e produção', oque: 'Mede vendas no varejo, produção industrial e encomendas: o ritmo da demanda e da fábrica.',
    economia: 'Consumo e produção fortes indicam economia aquecida; fracos antecipam desaceleração e cortes de juros.', brasil: 'Demanda forte nos parceiros sustenta exportações e commodities; fraca pesa no real.' },
  { id: 'comercio', re: /trade balance|balança comercial|exports|imports|current account|conta corrente|goods trade/i,
    nome: 'Comércio exterior', oque: 'Diferença entre o que o país exporta e importa, e o saldo das contas externas.',
    economia: 'Déficit grande pressiona a moeda do país; superávit a sustenta. Também mostra demanda por produtos estrangeiros.', brasil: 'Compras da China e dos EUA de minério, soja e petróleo definem parte do fluxo de dólares para o Brasil.' },
  { id: 'energia', re: /crude|\boil\b|petr[óo]leo|natural gas|gas storage|opec|rig count|gasoline|distillate|cushing/i,
    nome: 'Petróleo e energia', oque: 'Estoques e produção de petróleo, gás e derivados.',
    economia: 'Estoque baixo ou produção cortada sobe o preço da energia, que alimenta a inflação.', brasil: 'Brasil é exportador de petróleo: preço alto favorece Petrobras, balança comercial e o real, mas pressiona combustíveis internos.' },
  { id: 'imoveis', re: /housing|home sales|building permits|mortgage|house price|construction|habita[çc][ãa]o|imóve|new home|existing home|pending home/i,
    nome: 'Mercado imobiliário', oque: 'Vendas, licenças e preços de imóveis; muito sensível a juros.',
    economia: 'Mostra o efeito do juro sobre o crédito: imóveis fracos antecipam desaceleração do consumo.', brasil: 'Efeito indireto, via juros e dólar nos EUA.' },
  { id: 'leilao', re: /auction|leilão/i,
    nome: 'Leilão de títulos', oque: 'O governo vende títulos para se financiar; a taxa mostra a procura dos investidores.',
    economia: 'Demanda fraca eleva as taxas de longo prazo e encarece o crédito em toda a economia.', brasil: 'Treasuries mais caras (taxas altas) puxam o dólar para cima e pesam nos emergentes.' },
  { id: 'focus', re: /focus/i,
    nome: 'Boletim Focus', oque: 'Pesquisa semanal do Banco Central com as projeções de mercado para Selic, IPCA, PIB e câmbio.',
    economia: 'Mostra para onde o mercado aposta; mudanças relevantes antecipam o tom do Copom.', brasil: 'Evento doméstico: revisões de IPCA e Selic movem o DI.' },
]

export const NIVEL = { high: 'Alto', medium: 'Médio', low: 'Baixo', holiday: 'Feriado' }

// { nome, oque, economia, brasil, nivel, mapeado }. Sem categoria: impacto baixo, sem explicação inventada.
export function explicarEvento(e) {
  const alvo = e?.impact === 'holiday' ? 'holiday' : String(e?.title ?? '')
  const cat = CATEGORIAS.find((c) => c.re.test(alvo))
  const pais = LIGACAO_PAIS[e?.country]
  if (!cat) {
    return { mapeado: false, nome: null, nivel: 'low', nivelFonte: e?.impact ?? null, oque: null, economia: 'Impacto baixo: sem efeito relevante mapeado sobre a economia.', brasil: 'Impacto baixo: sem correlação direta relevante mapeada com o Brasil.' }
  }
  const brasil = e.country === 'BR' ? LIGACAO_PAIS.BR : [cat.brasil, pais].filter(Boolean).join(' ')
  return { mapeado: true, nome: cat.nome, nivel: e.impact, nivelFonte: e.impact, oque: cat.oque, economia: cat.economia, brasil }
}
