export const FREIGHT_SERIES='PCU483111483111'
export const FREIGHT_API=`https://api.bls.gov/publicAPI/v1/timeseries/data/${FREIGHT_SERIES}`
export const FREIGHT_SOURCE='https://data.bls.gov/timeseries/PCU483111483111'
export function parseFreight(payload) {
 if(payload?.status!=='REQUEST_SUCCEEDED')throw new Error('BLS não confirmou a consulta')
 const series=payload.Results?.series?.filter(s=>s.seriesID===FREIGHT_SERIES)
 if(series?.length!==1 || !Array.isArray(series[0].data))throw new Error('Série BLS incompatível')
 const points=[]
 for(const p of series[0].data) {
  if(p.period==='M13')continue // annual average is not an extra month
  if(!/^\d{4}$/.test(p.year) || !/^M(0[1-9]|1[0-2])$/.test(p.period) || !/^\d+(?:\.\d+)?$/.test(p.value || '') || !(Number(p.value)>0))throw new Error('Observação mensal BLS inválida')
  points.push({period:`${p.year}-${p.period.slice(1)}`,value:Number(p.value),preliminary:(p.footnotes || []).some(f=>f.code==='P')})
 }
 points.sort((a,b)=>a.period.localeCompare(b.period))
 if(!points.length || new Set(points.map(p=>p.period)).size!==points.length)throw new Error('Histórico BLS vazio ou duplicado')
 return points
}

export function freightFile(points,checkedAt,{stale=false,error}={}) {
 return {schemaVersion:1,generatedAt:checkedAt,series:{id:'freight-us-ppi',unit:'pontos · jun/1988=100',frequency:'monthly',sourceName:'U.S. Bureau of Labor Statistics (BLS)',sourceUrl:FREIGHT_SOURCE,checkedAt,stale,error,releaseDate:null,points,revisionNote:'Índice não dessazonalizado de preços recebidos por produtores dos EUA no transporte marítimo de carga (NAICS 483111). Valores preliminares podem ser revistos. Não representa rota brasileira, cotação spot ou US$/contêiner. BLS.gov não pode atestar os dados ou análises derivados após a extração dos dados de BLS.gov.',licenseUrl:'https://www.bls.gov/bls/linksite.htm',termsUrl:'https://www.bls.gov/developers/termsOfService.htm'}}
}
