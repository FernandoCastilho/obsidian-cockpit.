import { useEffect, useState } from 'react'
import ExecutiveRatesTable from './ExecutiveRatesTable.jsx'
import { DATA_BASE } from './useQuotes.js'
import { DATA_POLL_MS, startVisiblePolling } from './visiblePolling.js'
import { snapshotPeriods, snapshotRows, displayDate } from './ratesSnapshot.js'

export default function RatesSnapshot({ quotes, macro }) {
  const [state,setState]=useState({history:null,oil:null,errors:{}})
  const [now,setNow]=useState(Date.now)
  useEffect(()=>{
    let alive=true, at=0
    const controller=new AbortController()
    const stop=startVisiblePolling(async()=>{
      setNow(Date.now())
      if(Date.now()-at<600000)return
      at=Date.now()
      for(const [key,url] of [['history',`${DATA_BASE ? `${DATA_BASE}/` : './'}history.json`],['oil',`${import.meta.env.BASE_URL}oil.json`]]) {
        try {
          const res=await fetch(`${url}?t=${Math.floor(Date.now()/600000)}`,{signal:controller.signal})
          if(!res.ok)throw new Error('Fonte indisponível')
          const data=await res.json()
          if(key==='history'?!data.series:(data.benchmark!=='Brent'||data.kind!=='spot'||data.unit!=='USD/barril'||!Array.isArray(data.points)))throw new Error('Série inválida')
          if(alive)setState(s=>s[key]?.generatedAt && data.generatedAt < s[key].generatedAt ? {...s,errors:{...s.errors,[key]:'Mantida a série mais recente; resposta anterior recebida'}} : {...s,[key]:data,errors:{...s.errors,[key]:undefined}})
        }catch(e){if(alive&&e.name!=='AbortError')setState(s=>({...s,errors:{...s.errors,[key]:'Atualização pendente; último dado disponível'}}))}
      }
    },DATA_POLL_MS)
    return()=>{alive=false;stop();controller.abort()}
  },[])
  const periods=snapshotPeriods(now)
  const rows=snapshotRows({quotes,history:state.history,oil:state.oil,macro:macro.data,periods,errors:{...state.errors,macro:macro.status==='loading'?'Carregando indicadores…':macro.status==='error'?'Indicadores indisponíveis':undefined,history:state.errors.history || (!state.history?'Carregando histórico…':undefined),oil:state.errors.oil || (!state.oil?'Carregando histórico…':undefined)}})
  return <ExecutiveRatesTable rows={rows} periods={periods.map(p=>({...p,label:`${p.label} · ${displayDate(p.date)}`}))} description="Valores pontuais na data indicada ou na última observação anterior. Sem médias ou variações acumuladas." footnote="Câmbio: última cotação e fechamentos históricos. PTAX é uma referência separada. CDI, Selic e SOFR são taxas anualizadas, não rendimento do período. Selic mostra a data de início da taxa vigente. Brent é spot diário, sem intraday. Lacunas não são preenchidas. Fontes e datas reais aparecem em cada célula." />
}
