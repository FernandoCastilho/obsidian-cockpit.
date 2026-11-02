// Conteúdo de apoio por assunto da aba Setores: o que mexe no preço e o que perguntar na visita.
// `commodity`: ids do arquivo commodities.json (Pink Sheet/EIA); `daily`: id em insumos-precos.json (preço diário aproximado).
export const SETORES = [
  { id: 'industria', grupo: 'Produção e consumo', label: 'Indústria' },
  { id: 'comercio', grupo: 'Produção e consumo', label: 'Comércio e consumo' },
  { id: 'servicos', grupo: 'Serviços', label: 'Serviços' },
  { id: 'telecom', grupo: 'Serviços', label: 'Internet e telecom' }, // IBGE: informação e comunicação é serviço
]
// Ícone do rótulo de cada grupo nas abas: destaca o título do grupo para não se misturar com as abas.
export const GRUPO_ICONE = { 'Produção e consumo': '🏭', Serviços: '💼', Metais: '⛏️', Energia: '🛢️' }
export const INSUMOS = [
  { id: 'cobre', grupo: 'Metais', label: 'Cobre', commodity: ['copper'], daily: 'cobre',
    move: ['Demanda da China (construção, rede elétrica, veículos elétricos) e estoques nas bolsas (LME, COMEX).', 'Oferta de minas no Chile e no Peru; greves e queda de teor do minério.', 'Tarifas dos EUA sobre metais e o dólar: dólar forte pressiona a cotação em US$.', 'No Brasil, o custo em R$ sobe com o dólar mesmo que o preço em US$ fique parado.'],
    visita: ['Qual fatia do custo é cobre e como o contrato repassa a variação (LME + prêmio, em US$ ou R$)?', 'Há hedge de metal ou de câmbio? Qual prazo e qual volume?', 'Estoque de segurança: quantos dias de produção?', 'Consegue repassar alta ao preço final? Com que defasagem?'] },
  { id: 'aluminio', grupo: 'Metais', label: 'Alumínio', commodity: ['aluminum'],
    move: ['Energia: a fundição é eletrointensiva, então tarifa de energia pesa no custo do metal.', 'Produção e exportações da China; tarifas de importação nos EUA e na Europa.', 'Estoques da LME e preço da bauxita e da alumina.'],
    visita: ['Compra metal primário, laminado ou sucata? De quem?', 'Prêmio sobre a LME e moeda do contrato.', 'Há exposição a tarifa de importação?'] },
  { id: 'aco', grupo: 'Metais', label: 'Aço', commodity: [],
    move: ['Importação da China e medidas antidumping; cotas e tarifas no Brasil.', 'Preço do minério de ferro e do carvão (custo de produção).', 'Demanda da construção civil, de máquinas e de automóveis.'],
    visita: ['Qual tipo de aço (plano, longo, inox) e o fornecedor principal?', 'Reajuste negociado mensal, trimestral ou por tabela?', 'Importa aço direto? Qual a exposição ao dólar?'] },
  { id: 'minerio', grupo: 'Metais', label: 'Minério de ferro', commodity: ['iron-ore'],
    move: ['Produção de aço e demanda de construção na China (principal comprador).', 'Embarques da Vale e de australianas; chuva e acidentes na oferta.', 'Preço em Dalian e estoques nos portos chineses.'],
    visita: ['Qual a fatia de minério no custo (siderúrgicas, pelotização)?', 'Contrato indexado a que referência (62% Fe CFR China)?'] },
  { id: 'petroleo', grupo: 'Energia', label: 'Petróleo e diesel', commodity: ['wti', 'ny-diesel'],
    move: ['Decisões da OPEP+ e estoques dos EUA (EIA).', 'Política de preços da Petrobras e câmbio: o reajuste local acompanha Brent e dólar com defasagem.', 'Tensões geopolíticas e demanda global.'],
    visita: ['Quanto do custo é diesel/combustível (frota, logística, energia própria)?', 'Contrato de frete tem cláusula de reajuste pelo diesel?', 'Há hedge de combustível?'] },
]
export const TEMA_IDS = [...SETORES, ...INSUMOS].map((t) => t.id)

// "setor/insumo" no endereço: #setores/<id>; id desconhecido volta ao primeiro setor.
export const parseSetor = (view) => (TEMA_IDS.includes(String(view ?? '').split('?')[0]) ? String(view).split('?')[0] : SETORES[0].id)
