import { useState } from 'react'
import Expandable from './Expandable.jsx'
import { Plot, useWidth } from './HistoryChart.jsx'
import { contextValue } from './marketContext.js'
import { monthLabel, indicatorWindow, filterIndicatorPoints } from './indicatorHistory.js'
export default function IndicatorHistory({item,series,loading,failed,onClose}) {
 const points=series?.points || []
 const [preset,setPreset]=useState(12)
 const [inspected,setInspected]=useState(null)
 const [custom,setCustom]=useState(null)
 const [ref,width]=useWidth()
 const range=custom || indicatorWindow(points,preset)
 const selected=filterIndicatorPoints(points,range)
 const inspectedPoint=selected.points.find(p=>p.period===inspected) || selected.points.at(-1)
 const fmt=v=>`${contextValue({...item,value:v})} ${series?.unit || item.unit}`
 const plot=selected.points.map(p=>({t:Date.parse(`${p.period}-15T12:00:00Z`),bid:p.value}))
 const dateFmt=t=>{const period=new Date(t).toISOString().slice(0,7);return points.find(p=>p.period===period)?.periodLabel || monthLabel(period)}
 return <Expandable label={`histórico de ${item.label}`} modal onClose={onClose}>
  <h2>{item.label} · histórico</h2>
  <p>{series?.unit || item.unit} · {series?.frequency==='rolling-quarter' ? 'Trimestres móveis sobrepostos; eixo pelo mês final.' : 'Observações mensais, não diárias.'}</p>
  {loading ? <p role="status">Carregando histórico…</p> : !points.length ? <p role="status">{series?.unavailableReason || (failed ? 'Não foi possível carregar a série. Tente novamente mais tarde.' : 'Série histórica verificada ainda indisponível. Não foram gerados valores para preencher o gráfico.')}</p> : <>
   <div className="summary-period-controls"><div className="seg" role="group" aria-label="Período do indicador">{[[6,'6 meses'],[12,'12 meses'],[24,'24 meses'],['all','Tudo']].map(([value,label])=><button key={value} aria-pressed={!custom&&preset===value} onClick={()=>{setPreset(value);setCustom(null)}}>{label}</button>)}</div>
    <label>De <input type="month" aria-label="Mês inicial do indicador" value={range.start} min={points[0].period} max={points.at(-1).period} onChange={e=>setCustom({...range,start:e.target.value})}/></label>
    <label>Até <input type="month" aria-label="Mês final do indicador" value={range.end} min={points[0].period} max={points.at(-1).period} onChange={e=>setCustom({...range,end:e.target.value})}/></label></div>
   <p className="muted">Cobertura: {monthLabel(points[0].period)} a {monthLabel(points.at(-1).period)}. {points.length} observações. Meses ausentes não são preenchidos.</p>
   {failed && <p role="status">Última série preservada; não foi possível confirmar a atualização.</p>}
   {selected.error ? <p role="alert">{selected.error}</p> : selected.points.length ? <>
    <div ref={ref}><Plot points={plot} width={width} color="#6aa9ff" code={`indicator-${item.id}`} intraday={false} fmt={fmt} label={item.label} dateLabel={dateFmt} nice labels /></div>
    <p className="muted">Passe o mouse ou toque no gráfico para consultar uma observação. A tabela abaixo também permite consulta por teclado.</p>
    <label>Consultar competência <select aria-label="Consultar competência do indicador" value={inspectedPoint?.period || ''} onChange={e=>setInspected(e.target.value)}>{selected.points.map(p=><option key={p.period} value={p.period}>{p.periodLabel || monthLabel(p.period)}</option>)}</select></label>
    {inspectedPoint && <p aria-live="polite">{inspectedPoint.periodLabel || monthLabel(inspectedPoint.period)}: {fmt(inspectedPoint.value)}{inspectedPoint.preliminary ? ' · preliminar' : ''}</p>}
    <div className="oil-history-table" tabIndex={0} role="region" aria-label="Tabela histórica do indicador"><table><caption>{item.label} · observações do período</caption><thead><tr><th scope="col">Competência</th><th scope="col">{series.unit}</th></tr></thead><tbody>{[...selected.points].reverse().map(p=><tr key={p.period}><th scope="row">{p.periodLabel || monthLabel(p.period)}</th><td>{contextValue({...item,value:p.value})}</td></tr>)}</tbody></table></div>
   </> : <p role="status">Sem observações no período selecionado. Ausência não significa zero.</p>}
  </>}
  {series?.revisionNote && <p className="context-method">{series.revisionNote}</p>}
  <p><a href={series?.sourceUrl || item.sourceUrl} target="_blank" rel="noopener noreferrer">Fonte: {series?.sourceName || item.sourceName} ↗</a></p>
  <p className="context-method">Conferência: {(series?.checkedAt || item.checkedAt)?.slice(0,10).split('-').reverse().join('/') || 'não informada'}. A conferência não altera a competência da observação.</p>
 </Expandable>
}
