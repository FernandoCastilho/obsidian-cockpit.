import { b3Url, parseB3, pickDates } from './curves-lib.mjs'
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(`${s}T12:00:00Z`)) && new Date(`${s}T12:00:00Z`).toISOString().slice(0,10) === s

export async function requestB3(route, params, { fetchImpl = fetch, wait = ms => new Promise(r => setTimeout(r,ms)), tries = 4 } = {}) {
  let last
  for (let attempt=1; attempt<=tries; attempt++) {
    try {
      const response = await fetchImpl(b3Url(route,params), {headers:{'user-agent':'Mozilla/5.0',accept:'application/json'},signal:AbortSignal.timeout(30000)})
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const text = await response.text()
      if (!text.trim()) throw new Error(`resposta vazia (HTTP ${response.status})`)
      const data = JSON.parse(text)
      if (route === 'GetDate' && (!Array.isArray(data) || !data.length || data.some(d => typeof d !== 'string' || !validDate(d.slice(0,10))))) throw new Error('catálogo de datas vazio ou inválido')
      if (route === 'GetList' && (!Array.isArray(data?.results) || !data.results.length || !Number.isInteger(data?.page?.totalPages) || data.page.totalPages<1 || data.page.totalPages>20)) throw new Error('página de curva vazia ou inválida')
      return data
    } catch(error) {
      last = error
      if (attempt < tries) await wait(2000*attempt)
    }
  }
  throw last
}

// A date is published atomically: missing pagination cannot become a truncated fresh curve.
export async function collectB3Curve(id, minDays, { previous, request = requestB3, now = Date.now() } = {}) {
  const warnings=[]
  let dates, discoveryPending=false
  try { dates=await request('GetDate',{language:'pt-br',id}) }
  catch(error) {
    dates=(previous?.compare || []).map(p=>p.date).filter(validDate)
    if (!dates.length) throw new Error(`B3 ${id} datas: ${error.message}`)
    discoveryPending=true
    warnings.push(`Catálogo B3 ${id} indisponível (${error.message}); consulta limitada às datas oficiais já conhecidas. Referência mais recente não confirmada.`)
  }
  const picks=pickDates(dates), curves={}
  // texto da data como veio no catálogo (ex.: 2026-10-23T00:00:00), para pedir a curva no mesmo formato
  const raw=new Map((Array.isArray(dates)?dates:[]).map(d=>[String(d).slice(0,10),String(d)]))
  const fetchCurve=async(date)=>{
    const rows=[]
    let pages=1, totalRecords
    for(let page=1;page<=pages;page++) {
      const data=await request('GetList',{language:'pt-br',id,pageNumber:page,pageSize:100,date})
      if(page===1) { pages=data.page.totalPages; totalRecords=data.page.totalRecords }
      if(data.page.totalPages!==pages || data.page.totalRecords!==totalRecords) throw new Error('paginação mudou durante a consulta')
      rows.push(...data.results)
    }
    if(!Number.isInteger(totalRecords) || rows.length!==totalRecords) throw new Error('curva incompleta: quantidade de vértices difere do total informado')
    const pts=parseB3(rows,minDays)
    if(!pts.length || rows.some(row=>row.code!==id || row.day252==null || String(row.day252).trim()==='' || !Number.isFinite(Number(row.day252)) || !parseB3([row],0).length) || new Set(pts.map(p=>p[0])).size!==pts.length) throw new Error('instrumento incorreto ou vértices ausentes, inválidos ou duplicados')
    return pts
  }
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
  let latest=null
  for (const p of picks) {
    try {
      if(p===picks[0]) { latest=curves[p.date]=await fetchCurve(raw.get(p.date) ?? p.date); continue }
      // Se a B3 ignora a data pedida, devolve a curva do último dia: isso não pode virar uma "comparação" igual à de hoje.
      // Tenta o formato do catálogo, o ISO e o brasileiro; aceita o primeiro que traz uma curva diferente da mais recente.
      const [y,m,d]=p.date.split('-')
      let pts=null, tried=[]
      for(const fmt of [...new Set([raw.get(p.date) ?? p.date, p.date, `${d}/${m}/${y}`])]) {
        tried.push(fmt)
        const got=await fetchCurve(fmt)
        if(!same(got,latest)) { pts=got; if(fmt!==tried[0]) console.log(`B3 ${id} ${p.date}: curva obtida com a data no formato ${fmt}`); break }
      }
      if(!pts) throw new Error(`a B3 devolveu a curva do último dia para esta data (formatos ${tried.join(', ')})`)
      curves[p.date]=pts
    } catch(error) {
      if(p===picks[0]) throw new Error(`B3 ${id} ${p.date}: ${error.message}`)
      const prev=previous?.curves?.[p.date]
      if(prev && !same(prev,latest)) curves[p.date]=prev
      warnings.push(`B3 ${id} comparação ${p.date}: ${error.message}${curves[p.date] ? '; vértices anteriores preservados' : '; comparação omitida'}`)
    }
  }
  if(!picks.length || !curves[picks[0].date]) throw new Error(`B3 ${id}: nenhuma curva completa`)
  return {compare:picks.filter(p=>curves[p.date]),curves,checkedAt:now,sourceDate:picks[0].date,discoveryPending,warnings}
}
