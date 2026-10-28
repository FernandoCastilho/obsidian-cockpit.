import { Aviso } from './Avisos.jsx'
import { freightContext } from './freight.js'
import Sparkline from './Sparkline.jsx'
import IndicatorHistory from './IndicatorHistory.jsx'
import { normalizeIndicatorHistory, monthLabel } from './indicatorHistory.js'
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
function Card({item, failed, history, historyLoading, historyFailed, onOpen}) {
  return <article className={`context-card${onOpen ? ' context-interactive' : ''}`}>
    {onOpen && <button className="context-card-trigger" aria-label={`${item.label}: abrir histórico e detalhes`} onClick={onOpen} />}
    <h3>{item.label}</h3>
    <p className="context-number">{contextValue(item)} <span>{item.unit}</span></p>
    <p className="context-nature">{item.nature}{item.benchmark ? ` · ${item.benchmark}` : ''}</p>
    <dl><div><dt>Referência</dt><dd>{contextDate(item.period)}</dd></div><div><dt>Divulgação</dt><dd>{contextDate(item.releaseDate)}</dd></div></dl>
    {item.note && <Aviso title={item.label}><p className="context-note">{item.note}</p></Aviso>}
    {(failed || item.stale || item.value === null) && <p role="status" className="context-warning">{item.value === null ? 'Dado indisponível. Não representa zero.' : 'Último dado preservado; atualização não confirmada.'}</p>}
    {onOpen && <div className="context-mini">{history?.points?.length > 1 ? <><Sparkline points={history.points.slice(-12).map(p=>({bid:p.value}))} tone="flat" height={70}/><span>{monthLabel(history.points.slice(-12)[0].period)} a {monthLabel(history.points.at(-1).period)} · Abrir gráfico ›</span></> : <span>{historyLoading ? 'Carregando histórico…' : history?.unavailableReason || (historyFailed ? 'Histórico indisponível no momento' : 'Histórico ainda não disponível')} · Ver detalhes ›</span>}</div>}
    <Aviso title={`${item.label} · fonte`}><footer><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceName || 'Fonte oficial'} ↗</a><span>Conferência: {contextDate(item.checkedAt?.slice(0,10))}</span></footer></Aviso>
  </article>
}
function Cards({state, children}) {
  return <>{!state.data && <p role="status">{state.failed ? 'Não foi possível carregar os dados.' : 'Carregando dados…'}</p>}{children}</>
}
export default function MarketContext({ part = '' }) {
  const [open,setOpen] = useState(null)
  const history = useContextFile('indicator-history.json', normalizeIndicatorHistory)
  const market = useContextFile('market-indicators.json', parseMarket)
  const commodities = useContextFile('commodities.json', parseCommodities)
  const brent = useContextFile('oil.json', parseBrent)
  const freight = useContextFile('freight.json', freightContext)
  const all = [brent.data, ...(commodities.data || [])].filter(Boolean)
  return <div className="market-context">
    {open && <IndicatorHistory item={open} series={open.id==='freight-us-ppi' ? freight.data?.series : history.data?.find(s=>s.id===open.id)} loading={open.id==='freight-us-ppi' ? !freight.data&&!freight.failed : !history.data&&!history.failed} failed={open.id==='freight-us-ppi' ? freight.failed || freight.data?.series.stale : history.failed} onClose={()=>setOpen(null)}/>}
    {(!part || part === 'atividade') && <section aria-labelledby="market-context-heading"><h2 id="market-context-heading">Indicadores de mercado</h2>
      <Aviso title="Atividade e emprego"><p className="context-intro">Atividade e emprego. Indicadores observados, não projeções. Competências e datas de divulgação diferem.</p></Aviso>
      <Cards state={market}><div className="context-grid">{(market.data || []).map(item => <Card key={item.id} item={item} failed={market.failed} history={history.data?.find(s=>s.id===item.id)} historyLoading={!history.data&&!history.failed} historyFailed={history.failed} onOpen={()=>setOpen(item)}/>)}</div></Cards>
      {market.data && market.data.length < MARKET_IDS.length && <p role="status">Cobertura parcial: alguns indicadores não puderam ser carregados.</p>}
      <Aviso title="Atividade e emprego · método"><p className="context-method">Leituras conferidas manualmente nas fontes; não há atualização automática destes indicadores. PMI ISM em pontos: acima de 50 indica expansão; abaixo de 50, contração. Saldos de emprego podem ser negativos e sujeitos a revisão.</p></Aviso>
    </section>}
    {(!part || part === 'commodities') && <section aria-labelledby="commodities-context-heading"><h2 id="commodities-context-heading">Commodities</h2>
      <Aviso title="Commodities"><p className="context-intro">Referências internacionais em dólar. Petróleo spot diário e demais produtos em médias mensais, não preços em tempo real nem contratos futuros.</p></Aviso>
      {!all.length && <p role="status">{commodities.failed || brent.failed ? 'Não foi possível carregar as referências.' : 'Carregando referências…'}</p>}
      {all.some(item => ['brent','wti'].includes(item.id)) && <><h3 className="context-subheading">Petróleo · referências spot diárias</h3><div className="context-grid">{all.filter(item => ['brent','wti'].includes(item.id)).map(item => <Card key={item.id} item={item} failed={item.id === 'brent' ? brent.failed : commodities.failed}/>)}</div></>}
      {all.some(item => !['brent','wti'].includes(item.id)) && <><h3 className="context-subheading">Referências mensais · médias do mês indicado</h3><div className="context-grid">{all.filter(item => !['brent','wti'].includes(item.id)).map(item => <Card key={item.id} item={item} failed={commodities.failed}/>)}</div></>}
      {all.length > 0 && (!brent.data || !commodities.data || commodities.data.length < COMMODITY_IDS.length) && <p role="status">Cobertura parcial: uma das fontes ainda não está disponível.</p>}
      <Aviso title="Commodities · método"><p className="context-method">EIA e Banco Mundial. Coleta nas publicações do painel, preservando a última referência em falhas. A data da conferência não é a data do preço. Frequência de publicação e unidades variam; valores ausentes nunca são convertidos em zero.</p></Aviso>
    </section>}
    {(!part || part === 'frete') && <section aria-labelledby="freight-heading"><h2 id="freight-heading">Transporte marítimo · referência de preços</h2>
      <Aviso title="Transporte marítimo"><p className="context-intro">Índice geral dos produtores dos EUA. Não mede fretes China–Brasil ou Europa–Brasil; não substitui orçamento de transportadora.</p></Aviso>
      <Cards state={freight}><div className="context-grid">{freight.data && <Card item={freight.data.item} failed={freight.failed} history={freight.data.series} onOpen={()=>setOpen(freight.data.item)} />}</div></Cards>
      <Aviso title="Transporte marítimo · método"><p className="context-method">Fonte: U.S. Bureau of Labor Statistics, série PCU483111483111; índice mensal não dessazonalizado, jun/1988=100. Coleta central com limite de uma consulta por dia; meses não são transformados em cotações diárias. BLS.gov não pode atestar os dados ou análises derivados após a extração dos dados de BLS.gov. <a href="https://www.bls.gov/bls/linksite.htm" target="_blank" rel="noopener noreferrer">Domínio público e crédito</a> · <a href="https://www.bls.gov/developers/termsOfService.htm" target="_blank" rel="noopener noreferrer">Condições de uso</a>.</p></Aviso>
    </section>}
  </div>
}
