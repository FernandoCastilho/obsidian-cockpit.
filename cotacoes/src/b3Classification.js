// Nomes dos setores conferidos em fontes oficiais na pesquisa de 05/11/2026.
// Não é cadastro de emissores nem árvore integral de subsetores/segmentos.
// Sem scraping: a página de consulta veda coleta automatizada.
export const B3_CLASSIFICATION = {
  checkedOn: '2026-11-05',
  coverage: 'sectors-only',
  criteriaUrl: 'https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/acoes/consultas/criterio-de-classificacao/',
  sourceUrl: 'https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/acoes/consultas/classificacao-setorial/',
  automaticRefresh: false,
}
export const B3_SECTORS = [
  {id:'petroleo-gas-biocombustiveis',label:'Petróleo, Gás e Biocombustíveis'},
  {id:'materiais-basicos',label:'Materiais Básicos'},
  {id:'bens-industriais',label:'Bens Industriais'},
  {id:'consumo-nao-ciclico',label:'Consumo não Cíclico'},
  {id:'consumo-ciclico',label:'Consumo Cíclico'},
  {id:'saude',label:'Saúde'},
  {id:'tecnologia-informacao',label:'Tecnologia da Informação'},
  {id:'comunicacoes',label:'Comunicações'},
  {id:'utilidade-publica',label:'Utilidade Pública'},
  {id:'financeiro',label:'Financeiro'},
  {id:'outros',label:'Outros'},
].map(sector=>Object.freeze({...sector,subsectors:[]}))
export function b3SectorFromRoute(route) { return B3_SECTORS.find(sector=>route==='b3/'+sector.id) || null }
