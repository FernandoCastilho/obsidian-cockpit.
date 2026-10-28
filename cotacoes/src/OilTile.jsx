import { Aviso } from './Avisos.jsx'
import { useEffect, useState } from 'react'
import Expandable from './Expandable.jsx'
import OilHistory from './OilHistory.jsx'
import OilLiveQuote from './OilLiveQuote.jsx'
import { brentReturns } from './oilReference.js'
import { oilStatus } from './oilStatus.js'
import RefreshButton from './RefreshButton.jsx'
import { onRefresh } from './refreshBus.js'

// Commodity independente: nunca entra no câmbio ou nos cálculos em reais.
const usd = (v, sign = false) => !Number.isFinite(v) ? '—' : (sign ? (v > 0 ? '+' : v < 0 ? '−' : '') : '') + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2).replace('.', ',')}%`
const tone = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat')
const br = (d) => d.split('-').reverse().join('/')

export default function OilTile({ spark, dates, presets, onDates, onPreset, dateError, table = false, openRequest = 0 }) {
  const [expanded, setExpanded] = useState(false)
  // o card do Brent no topo do Mercado pede a abertura do histórico daqui
  useEffect(() => { if (openRequest > 0) setExpanded(true) }, [openRequest])
  const [liveOpen, setLiveOpen] = useState(false)
  const [state, setState] = useState({ data: null, error: false })
  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}oil.json`, { signal: controller.signal, cache: 'no-cache' })
        if (!response.ok) throw new Error('Fonte indisponível')
        const data = await response.json()
        if (data.benchmark !== 'Brent' || data.kind !== 'spot' || data.unit !== 'USD/barril' || !Array.isArray(data.points)) throw new Error('Série inválida')
        setState({ data, error: !!data.error || !!data.stale })
      } catch (error) {
        if (error.name !== 'AbortError') setState((old) => ({ ...old, error: true }))
      }
    }
    load()
    const off = onRefresh((files) => files.includes('oil.json') ? load() : undefined)
    const timer = setInterval(load, 10 * 60 * 1000)
    return () => { off(); controller.abort(); clearInterval(timer) }
  }, [])
  const data = state.data
  const points = (data?.points || []).filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.value) && p.value > 0)
  const status = oilStatus(data, state.error)
  const { last: latest, delta, day, month, year } = brentReturns(data)
  const change = (v, title) => Number.isFinite(v) ? <td className={'pct ' + tone(v)} title={title}>{pct(v)}</td> : <td className="muted"><span aria-label="Variação indisponível">—</span></td>
  return <>
    {table ? <section className="oil-tile other-market" aria-labelledby="other-market-title">
      <div className="ctx-head"><h3 id="other-market-title">Demais</h3><RefreshButton files={['oil.json']} label="Brent (EIA)" /></div>
      <div className="other-market-scroll" role="region" aria-label="Tabela Demais; role para ver a cotação, a data e o histórico" tabIndex={0}>
        <table className="market-table oil-eia-table" aria-label="Demais instrumentos - referências independentes"><thead><tr><th scope="col">Instrumento</th><th scope="col">Cotação <small>(US$/barril)</small></th><th scope="col" aria-label="Variação absoluta da última observação em dólares">Δ dia <small>(US$)</small></th><th scope="col" aria-label="Variação percentual da última observação">Δ dia %</th><th scope="col" aria-label="Acumulado no mês em percentual">Mês %</th><th scope="col" aria-label="Acumulado no ano em percentual">Ano %</th><th scope="col">Observação</th></tr></thead>
          <tbody className="market-record" style={{ '--series': 'var(--amber)' }}><tr className="market-values" onClick={() => setExpanded(true)}><th scope="row"><button type="button" className="market-open" aria-label="Petróleo Brent: abrir histórico" onClick={(e) => { e.stopPropagation(); setExpanded(true) }}><b>Brent spot · EIA <span aria-hidden="true">›</span></b><small>Petróleo · histórico EIA</small></button></th>
            <td className="market-price">{latest ? usd(latest.value) : '—'}</td>
            <td className={Number.isFinite(delta) ? 'pct ' + tone(delta) : 'muted'}>{Number.isFinite(delta) ? usd(delta, true) : <span aria-label="Variação absoluta indisponível">—</span>}</td>
            {change(day, 'Última observação sobre a anterior')}{change(month?.value, month ? `Base: ${br(month.baseDate)}` : undefined)}{change(year?.value, year ? `Base: ${br(year.baseDate)}` : undefined)}
            <td className="oil-date">{latest ? <time dateTime={latest.date}>{br(latest.date)}</time> : '—'}</td></tr></tbody>
        </table>
      </div>
      <Aviso title="Brent spot · EIA"><p className="chart-basis">Brent spot · EIA · divulgação defasada, não é tempo real. Preço de mercado publicado pela EIA, originado de Refinitiv/LSEG; não é preço fixado pelo governo. <a href="https://www.eia.gov/dnav/pet/hist/RBRTED.htm" target="_blank" rel="noreferrer">Fonte e série oficial</a>. {typeof data?.releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.releaseDate) && <>Publicação: {data.releaseDate.split('-').reverse().join('/')}. </>}{typeof data?.nextReleaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.nextReleaseDate) && <>Próxima divulgação prevista: {data.nextReleaseDate.split('-').reverse().join('/')}. </>}</p></Aviso>
      {(!latest || status.pending) && <p className="status stale" role="status">{!latest ? state.error || data ? 'Referência EIA indisponível.' : 'Carregando referência EIA.' : status.label}</p>}
      <div className="oil-secondary-reference"><button type="button" className="oil-details" onClick={() => setLiveOpen(true)} aria-haspopup="dialog">Outra referência: CFD indicativo</button><Aviso title="Brent · referência CFD"><small>TradingView · USD/barril · atraso não informado. Série independente do spot EIA.</small></Aviso></div>
    </section> : <article className="tile oil-tile" aria-label="Petróleo Brent CFD indicativo">
      <div className="tile-head"><span className="tile-name"><b>Petróleo Brent</b></span><button type="button" className="oil-details" aria-label="Petróleo Brent: abrir histórico" onClick={() => setExpanded(true)}>Histórico EIA ›</button></div>
      <OilLiveQuote />
    </article>}
    {liveOpen && <Expandable modal label="Referência online Brent" onClose={() => setLiveOpen(false)}><h2>Brent — CFD indicativo</h2><OilLiveQuote /></Expandable>}
    {expanded && <OilHistory data={data} points={points} spark={spark} dates={dates} presets={presets} onDates={onDates} onPreset={onPreset} dateError={dateError} stale={status.pending} loading={!data && !state.error} onClose={() => setExpanded(false)} />}
  </>
}
