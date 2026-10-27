import { focusFor } from './macro-lib.mjs'
export async function collectFocus({fetchImpl=fetch,now=Date.now()}={}) {
 const since=new Date(now-21*864e5).toISOString().slice(0,10),rows=[];let date=''
 for(const [indicator,label] of Object.entries({Selic:'Selic',IPCA:'IPCA','PIB Total':'PIB','Câmbio':'Câmbio'})) {
  const filter=encodeURIComponent(`Indicador eq '${indicator}' and Data ge '${since}' and baseCalculo eq 0`)
  const url=`https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$top=100&$filter=${filter}&$orderby=Data%20desc&$format=json`
  const response=await fetchImpl(url,{signal:AbortSignal.timeout(30000)})
  if(!response.ok)throw new Error(`Focus ${indicator}: HTTP ${response.status}`)
  const f=focusFor((await response.json())?.value)
  if(!f || !/^\d{4}-\d{2}-\d{2}$/.test(f.date) || Date.parse(f.date+'T12:00:00Z')>now || !Object.keys(f.values).length || Object.entries(f.values).some(([year,v])=>!/^\d{4}$/.test(year)||!Number.isFinite(v.median)) || (date && f.date!==date))throw new Error('Focus incompleto ou datas de coleta divergentes')
  date=f.date;rows.push({label,indicator,values:f.values})
 }
 return {date,rows}
}
export function preserveFocus(out,previous,{checkedAt,error,skipped=false}={}) {
 out.focus=previous?.focus ?? null
 out.focusCheckedAt=skipped ? previous?.focusCheckedAt ?? null : checkedAt
 out.focusSchedule={cadence:'segunda 09:30 America/Sao_Paulo',skipped,error:error || null}
 if(previous?.stale?.focus)out.stale={...out.stale,focus:previous.stale.focus}
 if(error && out.focus)out.stale={...out.stale,focus:previous?.stale?.focus ?? previous?.focusCheckedAt ?? previous?.generatedAt ?? null}
 return out
}
