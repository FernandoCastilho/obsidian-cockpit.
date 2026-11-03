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
 out.focusSchedule={cadence:'segunda 08:30 America/Sao_Paulo (repete terça 08:30)',skipped,error:error || null}
 if(previous?.stale?.focus)out.stale={...out.stale,focus:previous.stale.focus}
 if(error && out.focus)out.stale={...out.stale,focus:previous?.stale?.focus ?? previous?.focusCheckedAt ?? previous?.generatedAt ?? null}
 return out
}
// Repescagem: o Focus sai segunda às 8h25 (terça, se segunda for feriado), mas a API do BC às vezes publica depois.
// Nas coletas de hora em hora, a partir das 8h de Brasília, busca de novo enquanto o boletim publicado for anterior à
// sexta-feira da semana passada (a data de coleta do boletim da semana). Fora disso, as coletas de hora em hora não tocam no Focus.
export function expectedFocusDate(now = Date.now()) {
 const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(new Date(now)).map((x) => [x.type, x.value]))
 const day = new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`), dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
 day.setUTCDate(day.getUTCDate() - ((dow + 6) % 7) - 3) // segunda desta semana − 3 dias = sexta anterior
 return day.toISOString().slice(0, 10)
}
export function focusCatchUp(previousDate, now = Date.now()) {
 const hour = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(new Date(now)))
 const expected = expectedFocusDate(now), today = new Date(now)
 const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(today))
 const startedThisWeek = dow > 1 || (dow === 1 && hour >= 8) // segunda a partir das 8h, ou terça em diante
 return startedThisWeek && (!previousDate || previousDate < expected)
}
