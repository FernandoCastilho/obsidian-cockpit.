export const RECOVERY_REVIEW_MS=7*86400000
export const RECOVERY_SOURCE_URLS=[
  {id:'catalogo',name:'Catálogo público do CNPJ',url:'https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj'},
  {id:'arquivos',name:'Repositório público da Receita Federal',url:'https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9'},
  {id:'leiaute',name:'Leiaute de dados abertos do CNPJ',url:'https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf'},
]
export function recoveryReviewDue(previous,now=Date.now()){return !previous?.reviewedAt || now<previous.reviewedAt || now-previous.reviewedAt>=RECOVERY_REVIEW_MS}
export async function reviewRecoverySources({fetchImpl=fetch,now=Date.now()}={}){
  // Somente HEAD de três endereços oficiais. Não baixa bases de CNPJ, processos ou conteúdo licenciado.
  const sourceChecks=await Promise.all(RECOVERY_SOURCE_URLS.map(async source=>{
    try {const res=await fetchImpl(source.url,{method:'HEAD',signal:AbortSignal.timeout(12000)});return {...source,checkedAt:now,available:res.ok,httpStatus:res.status}}
    catch {return {...source,checkedAt:now,available:false,httpStatus:null}}
  }))
  return {schemaVersion:1,generatedAt:now,reviewedAt:now,nextReviewAt:now+RECOVERY_REVIEW_MS,sourceChecks,
    weekly:{status:'unavailable',counts:{pedido:null,deferimento:null,concessao:null},sectors:[],reason:'Não há fonte nacional semanal por setor validada para este painel. Sem contagem de pedidos, deferimentos ou concessões.'},
    registry:{status:'not-ingested',reference:null,count:null,frequency:'monthly',reason:'A base mensal do CNPJ ainda não foi processada e validada; situação especial não equivale a pedido judicial semanal.'},
    limitations:['Conferir endereço não valida o conteúdo nem uma contagem.','Não há ingestão ou redistribuição de DataJud ou Serasa.','O estoque cadastral exige CNPJs básicos distintos e classificação pelo CNAE principal da matriz, com cobertura e qualidade verificadas.'],
  }
}
