export function freightContext(data) {
 const series=data?.series
 if(series?.id!=='freight-us-ppi' || !Array.isArray(series.points) || typeof series.checkedAt!=='string')throw new Error('Referência de transporte inválida')
 const points=series.points.filter(p=>/^\d{4}-(0[1-9]|1[0-2])$/.test(p.period) && Number.isFinite(p.value) && p.value>0).sort((a,b)=>a.period.localeCompare(b.period))
 if(points.length!==series.points.length || new Set(points.map(p=>p.period)).size!==points.length)throw new Error('Histórico de transporte inválido')
 const latest=points.at(-1)
 return {series:{...series,points},item:{id:series.id,label:'EUA · Transporte marítimo (PPI)',value:latest?.value ?? null,decimals:3,unit:series.unit,nature:'Índice mensal de preços ao produtor · EUA',period:latest?.period,releaseDate:series.releaseDate,checkedAt:series.checkedAt,sourceName:series.sourceName,sourceUrl:series.sourceUrl,stale:series.stale,note:`Não é cotação de rota nem US$/contêiner.${latest?.preliminary?' Referência preliminar.':''}`}}
}
