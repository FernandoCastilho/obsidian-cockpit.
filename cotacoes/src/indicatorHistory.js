import { MARKET_IDS } from './marketContext.js'
const month = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
export function normalizeIndicatorHistory(data) {
 if (!Array.isArray(data?.series)) throw new Error('Histórico inválido')
 return data.series.filter(s=> MARKET_IDS.includes(s.id) && Array.isArray(s.points) && typeof s.unit==='string' && /^https:\/\//.test(s.sourceUrl || '')).map(s=> {
  const points=s.points.filter(p=>month(p.period) && Number.isFinite(p.value)).sort((a,b)=>a.period.localeCompare(b.period))
  if (points.length!==s.points.length || new Set(points.map(p=>p.period)).size!==points.length) throw new Error('Observações inválidas ou duplicadas')
  return {...s,points}
 })
}
export function monthLabel(period) { return month(period) ? period.split('-').reverse().join('/') : '—' }
export function indicatorWindow(points, months=12) {
 const end=points.at(-1)?.period || ''
 if (!end || months==='all') return {start:points[0]?.period || '',end}
 const d=new Date(`${end}-15T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()-months+1)
 return {start:d.toISOString().slice(0,7),end}
}
export function filterIndicatorPoints(points, range) {
 if (!month(range.start)||!month(range.end)) return {error:'Informe o mês inicial e final.',points:[]}
 if (range.start>range.end) return {error:'O início não pode ser posterior ao fim.',points:[]}
 return {error:null,points:points.filter(p=>p.period>=range.start&&p.period<=range.end)}
}
