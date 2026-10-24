import { displayDate } from './ratesSnapshot.js'

const DEFINITIONS = [
  ['FED','EUA · Fed (faixa-alvo)','Federal Reserve / FOMC'],
  ['ECB','Área do euro · BCE (depósito)','Banco Central Europeu'],
  ['BOE','Reino Unido · Bank Rate','Bank of England'],
  ['BOJ','Japão · Meta overnight','Bank of Japan'],
]
const n = v => v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
function pointValue(p) {
  if (Number.isFinite(p?.lower) && Number.isFinite(p?.upper) && p.lower <= p.upper) return `${n(p.lower)}%–${n(p.upper)}%`
  if (Number.isFinite(p?.value)) return `${p.approximate ? '≈' : ''}${n(p.value)}%`
  return null
}
export function policyRows(data,periods,{loading=false,error=false,now=Date.now()}={}) {
  return DEFINITIONS.map(([id,label,source]) => {
    const series = data?.series?.[id]
    const pending = error || series?.stale || (series?.checkedAt && now - series.checkedAt > 36*3600e3)
    const points = series?.points || []
    return {id,label,unit:'Política monetária · % a.a.',cells:Object.fromEntries(periods.map(period => {
      const p = points.filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date || '') && p.date <= period.date && pointValue(p)!=null)
        .reduce((a,b)=>!a || b.date>a.date ? b : a,null)
      return [period.id,{
        value:p ? pointValue(p) : '-', date:p ? displayDate(p.date) : undefined,
        status:p ? `${pending ? 'Atualização pendente · ' : ''}Vigente desde a data indicada${p.approximate ? ' · alvo aproximado' : ''}`
          : loading ? 'Carregando fonte oficial…' : 'Sem vigência verificada até esta data',
        source,sourceUrl:p?.sourceUrl || series?.sourceUrl,
      }]
    }))}
  })
}
