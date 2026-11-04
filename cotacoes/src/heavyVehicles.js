export const HEAVY_SEGMENTS = {caminhoes:'Caminhões',onibus:'Ônibus'}
export const HEAVY_METRICS = {emplacamento:'Emplacamento',exportacao:'Exportação',producao:'Produção'}
export function normalizeHeavy(data) {
 if(data?.schemaVersion!==1 || !/^\d{4}-\d{2}$/.test(data.period||'') || !Number.isFinite(data.generatedAt) || !Number.isFinite(data.checkedAt) || !Array.isArray(data.indicators) || data.indicators.length!==6)throw new Error('Indicadores de veículos pesados indisponíveis')
 if(!/^https:\/\/(?:www\.)?anfavea\.com\.br\/cartas\/carta\d+\.pdf$/.test(data.sourceUrl||''))throw new Error('Origem inválida')
 if(!Number.isFinite(Date.parse(data.period+'-01T12:00:00Z'))||!Number.isInteger(data.edition)||!Number.isInteger(data.sourcePage))throw new Error('Referência inválida')
 const seen=new Set()
 for(const i of data.indicators){const id=i.segment+':'+i.metric;if(!HEAVY_SEGMENTS[i.segment] || !HEAVY_METRICS[i.metric] || seen.has(id))throw new Error('Cobertura de indicadores inválida');seen.add(id);for(const k of ['current','previousMonth','previousYear','yearToDate','previousYearToDate'])if(!Number.isInteger(i[k]?.value)||i[k].value<0||![0,1,10,100,1000].includes(i[k].rounding))throw new Error('Contagem inválida');for(const k of ['monthPct','yearPct','ytdPct'])if(!Number.isFinite(i[k])||i[k]<-100)throw new Error('Variação inválida')}
 return data
}
