import {createHash} from 'node:crypto'
import { normalizeHeavy } from '../src/heavyVehicles.js'
export const HEAVY_PAGE='https://anfavea.com.br/site/conteudos/carta-da-anfavea/'
export const HEAVY_CENTRAL='https://anfavea.com.br/site/central-de-dados/'
export const HEAVY_TTL=24*3600000
const MONTHS=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
export function latestCarta(html){const urls=[...html.matchAll(/(?:https?:)?\/\/(?:www\.)?anfavea\.com\.br\/cartas\/carta(\d+)\.pdf/gi)].map(m=>({n:Number(m[1]),url:m[0].startsWith('//')?'https:'+m[0]:m[0]}));if(!urls.length)throw new Error('Carta oficial não encontrada');return urls.sort((a,b)=>b.n-a.n)[0].url}
function countToken(x){if(x.endsWith('mil')){const n=x.slice(0,-3);if(!/^\d+(?:,\d+)?$/.test(n))throw new Error('Contagem arredondada inválida');return {value:Math.round(Number(n.replace(',','.'))*1000),rounding:1000/10**(n.split(',')[1]?.length||0)}}if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(x))throw new Error('Contagem inteira inválida');return {value:Number(x.replaceAll('.','')),rounding:0}}
function coherent(a,b,pct){const loA=Math.max(0,a.value-a.rounding/2),hiA=a.value+a.rounding/2,loB=b.value-b.rounding/2,hiB=b.value+b.rounding/2;if(!(loB>0)||pct<(loA/hiB-1)*100-.06||pct>(hiA/loB-1)*100+.06)throw new Error('Variação incompatível com as contagens publicadas')}
export function parseHeavyOverview(text,{sourceUrl,now=Date.now(),sha256,sourcePage=3}={}){
 if(!/Caminh[õo]es/i.test(text)||!/Ônibus/i.test(text))throw new Error('Página de pesados ausente')
 const ref=text.match(new RegExp('('+MONTHS.join('|')+')\\s+de\\s+(20\\d{2})','i')),edition=text.match(/([A-Z]{3})\s+(20\d{2})\s*I\s*Ed\.?\s*(\d+)/)
 if(!ref||!edition)throw new Error('Referência ou edição ausente')
 const period=ref[2]+'-'+String(MONTHS.indexOf(ref[1].toLowerCase())+1).padStart(2,'0')
 if(period>new Date(now).toISOString().slice(0,7))throw new Error('Referência futura')
 const issueMonth=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'].indexOf(edition[1])+1,issuePeriod=edition[2]+'-'+String(issueMonth).padStart(2,'0');if(!issueMonth||issuePeriod<period||issuePeriod>new Date(now).toISOString().slice(0,7))throw new Error('Edição incompatível com a referência')
 const tokens=text.split(/\r?\n/).map(l=>l.replace(/\s/g,'')).filter(l=>/^-?\d+(?:,\d+)?%$/.test(l)||/^\d+(?:[.,]\d+)?(?:mil)?$/.test(l))
 const groups=[]
 for(let n=0;n<tokens.length;n++)if(tokens[n].endsWith('%')){const p=tokens.slice(n,n+3),v=tokens.slice(n+3,n+8);if(p.length!==3||v.length!==5||!p.every(x=>x.endsWith('%'))||v.some(x=>x.endsWith('%')))throw new Error('Estrutura da tabela mudou');groups.push({p:p.map(x=>Number(x.replace('%','').replace(',','.'))),v:v.map(countToken)});n+=7}
 if(groups.length!==6)throw new Error('Esperados seis indicadores de pesados')
 const indicators=groups.map((g,n)=>{const segment=n<3?'caminhoes':'onibus',metric=['emplacamento','exportacao','producao'][n%3],p=n%3===2?[g.p[2],g.p[0],g.p[1]]:g.p;const [current,previousMonth,previousYear,yearToDate,previousYearToDate]=g.v;coherent(current,previousMonth,p[0]);coherent(current,previousYear,p[1]);coherent(yearToDate,previousYearToDate,p[2]);return {segment,metric,current,previousMonth,previousYear,yearToDate,previousYearToDate,monthPct:p[0],yearPct:p[1],ytdPct:p[2]}})
 return normalizeHeavy({schemaVersion:1,generatedAt:now,checkedAt:now,period,edition:Number(edition[3]),editionLabel:edition[1]+'/'+edition[2],frequency:'monthly',source:'ANFAVEA — Carta da ANFAVEA',sourceUrl,sourcePage,sha256,indicators})
}
export function retainHeavy(previous,error,now){if(!previous)return {schemaVersion:1,generatedAt:null,checkedAt:now,status:'unavailable',error,indicators:[]};return {...previous,checkedAt:now,stale:true,error}}

export async function refreshHeavy({previous,now=Date.now(),fetchImpl=fetch,extractPdf,force=false}={}){
 if(!force && previous?.checkedAt && now>=previous.checkedAt && now-previous.checkedAt<HEAVY_TTL && !previous.stale)return previous
 try{
  const get=async url=>{const r=await fetchImpl(url,{headers:{'user-agent':'PainelEspecialista/1.0 (estatisticas publicas ANFAVEA)'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error('Fonte ANFAVEA: HTTP '+r.status);return r}
  const sourceUrl=latestCarta(await (await get(HEAVY_PAGE)).text()),buf=Buffer.from(await (await get(sourceUrl)).arrayBuffer())
  if(buf.length>20*1024*1024||buf.subarray(0,5).toString()!=='%PDF-')throw new Error('PDF inválido')
  const sha256=createHash('sha256').update(buf).digest('hex')
  if(previous?.sha256===sha256)return {...previous,checkedAt:now,stale:false,error:undefined}
  const pdf=await extractPdf(buf),result=parseHeavyOverview(pdf.text,{sourceUrl,sha256,now,sourcePage:pdf.page})
  if(previous?.period>result.period)throw new Error('Publicação anterior à referência preservada')
  return result
 }catch(e){return retainHeavy(previous,e.message,now)}
}
