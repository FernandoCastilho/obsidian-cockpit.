const META={
 'freight-us-ppi':{label:'EUA · Transporte marítimo (PPI)',nature:'Índice mensal de preços ao produtor · EUA',base:'jun/1988 = 100'},
 'freight-jp-sppi':{label:'Japão · Transporte marítimo (SPPI)',nature:'Índice mensal de preços de serviços · Japão',base:'média de 2020 = 100'},
}
export const FREIGHT_IDS=Object.keys(META)
export const freightBase=id=>META[id]?.base
export function freightContext(data) {
 const series=data?.series
 const meta=META[series?.id]
 if(!meta || !Array.isArray(series.points) || typeof series.checkedAt!=='string')throw new Error('Referência de transporte inválida')
 const points=series.points.filter(p=>/^\d{4}-(0[1-9]|1[0-2])$/.test(p.period) && Number.isFinite(p.value) && p.value>0).sort((a,b)=>a.period.localeCompare(b.period))
 if(points.length!==series.points.length || new Set(points.map(p=>p.period)).size!==points.length)throw new Error('Histórico de transporte inválido')
 const latest=points.at(-1)
 return {series:{...series,points},item:{id:series.id,label:meta.label,value:latest?.value ?? null,decimals:3,unit:series.unit,nature:meta.nature,period:latest?.period,releaseDate:series.releaseDate,checkedAt:series.checkedAt,sourceName:series.sourceName,sourceUrl:series.sourceUrl,stale:series.stale,note:`Não é cotação de rota nem US$/contêiner.${latest?.preliminary?' Referência preliminar.':''}`}}
}
