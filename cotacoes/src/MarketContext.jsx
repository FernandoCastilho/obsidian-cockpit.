import { useEffect, useState } from 'react'
import { MARKET_IDS, COMMODITY_IDS, contextItems, contextDate, contextValue, brentContext } from './marketContext.js'
import './MarketContext.css'

function useContextFile(file, parse) {
  const [state, setState] = useState({data:null, failed:false})
  useEffect(() => {
    let alive = true, pending = false
    const controller = new AbortController()
    const load = async () => {
      if (pending || document.hidden) return
      pending = true
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}${file}?t=${Math.floor(Date.now()/600000)}`, {signal:controller.signal})
        if (!response.ok) throw new Error('Fonte indisponível')
        const data = parse(await response.json())
        if (alive) setState({data, failed:false})
      } catch (error) { if (alive && error.name !== 'AbortError') setState(old => ({...old, failed:true})) }
      finally { pending = false }
    }
    load()
    const timer = setInterval(load, 600000)
    const resume = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', resume)
    return () => { alive=false; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange',resume) }
  }, [file, parse])
  return state
}
const parseMarket = data => contextItems(data, 'indicators', MARKET_IDS)
const parseCommodities = data => contextItems(data, 'commodities', COMMODITY_IDS)
const parseBrent = data => { const item = brentContext(data); if (!item) throw new Error('Brent inválido'); return item }
function Card({item, failed}) {
  return <article className="context-card">
    <h3>{item.label}</h3>
    <p className="context-number">{contextValue(item)} <span>{item.unit}</span></p>
    <p className="context-nature">{item.nature}{item.benchmark ? ` · ${item.benchmark}` : ''}</p>
    <dl><div><dt>Referência</dt><dd>{contextDate(item.period)}</dd></div><div><dt>Divulgação</dt><dd>{contextDate(item.releaseDate)}</dd></div></dl>
    {item.note && <p className="context-note">{item.note}</p>}
    {(failed || item.stale || item.value === null) && <p role="status" className="context-warning">{item.value === null ? 'Dado indisponível. Não representa zero.' : 'Último dado preservado; atualização não confirmada.'}</p>}
    <footer><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceName || 'Fonte oficial'} ↗</a><span>Conferência: {contextDate(item.checkedAt?.slice(0,10))}</span></footer>
  </article>
}
function Cards({state, children}) {
  return <>{!state.data && <p role="status">{state.failed ? 'Não foi possível carregar os dados.' : 'Carregando dados…'}</p>}{children}</>
}
export default function MarketContext() {
  const market = useContextFile('market-indicators.json', parseMarket)
  const commodities = useContextFile('commodities.json', parseCommodities)
  const brent = useContextFile('oil.json', parseBrent)
  const all = [brent.data, ...(commodities.data || [])].filter(Boolean)
  return <div className="market-context">
    <section aria-labelledby="market-context-heading"><h2 id="market-context-heading">Indicadores de mercado</h2>
      <p className="context-intro">Atividade e emprego. Indicadores observados, não projeções. Competências e datas de divulgação diferem.</p>
      <Cards state={market}><div className="context-grid">{(market.data || []).map(item => <Card key={item.id} item={item} failed={market.failed}/>)}</div></Cards>
      {market.data && market.data.length < MARKET_IDS.length && <p role="status">Cobertura parcial: alguns indicadores não puderam ser carregados.</p>}
      <p className="context-method">Leituras conferidas manualmente nas fontes; não há atualização automática destes indicadores. PMI ISM em pontos: acima de 50 indica expansão; abaixo de 50, contração. Saldos de emprego podem ser negativos e sujeitos a revisão.</p>
    </section>
    <section aria-labelledby="commodities-context-heading"><h2 id="commodities-context-heading">Commodities</h2>
      <p className="context-intro">Referências internacionais em dólar. Petróleo spot diário e demais produtos em médias mensais, não preços em tempo real nem contratos futuros.</p>
      {!all.length && <p role="status">{commodities.failed || brent.failed ? 'Não foi possível carregar as referências.' : 'Carregando referências…'}</p>}
      {all.some(item => ['brent','wti'].includes(item.id)) && <><h3 className="context-subheading">Petróleo · referências spot diárias</h3><div className="context-grid">{all.filter(item => ['brent','wti'].includes(item.id)).map(item => <Card key={item.id} item={item} failed={item.id === 'brent' ? brent.failed : commodities.failed}/>)}</div></>}
      {all.some(item => !['brent','wti'].includes(item.id)) && <><h3 className="context-subheading">Referências mensais · médias do mês indicado</h3><div className="context-grid">{all.filter(item => !['brent','wti'].includes(item.id)).map(item => <Card key={item.id} item={item} failed={commodities.failed}/>)}</div></>}
      {all.length > 0 && (!brent.data || !commodities.data || commodities.data.length < COMMODITY_IDS.length) && <p role="status">Cobertura parcial: uma das fontes ainda não está disponível.</p>}
      <p className="context-method">EIA e Banco Mundial. Coleta nas publicações do painel, preservando a última referência em falhas. A data da conferência não é a data do preço. Frequência de publicação e unidades variam; valores ausentes nunca são convertidos em zero.</p>
    </section>
  </div>
}
