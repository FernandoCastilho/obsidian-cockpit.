import { useEffect, useState } from 'react'
import Expandable from './Expandable.jsx'
import OilHistory from './OilHistory.jsx'
import OilLiveQuote from './OilLiveQuote.jsx'
import { latestBrentSpot } from './oilReference.js'
import { oilStatus } from './oilStatus.js'

// Commodity independente: nunca entra no câmbio ou nos cálculos em reais.
export default function OilTile({ spark, dates, presets, onDates, onPreset, dateError, table = false }) {
  const [expanded, setExpanded] = useState(false)
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
    const timer = setInterval(load, 10 * 60 * 1000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [])
  const data = state.data
  const points = (data?.points || []).filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.value) && p.value > 0)
  const status = oilStatus(data, state.error)
  const latest = latestBrentSpot(data)
  return <>
    {table ? <section className="oil-tile other-market" aria-labelledby="other-market-title">
      <h3 id="other-market-title">Demais</h3>
      <div className="other-market-scroll" role="region" aria-label="Tabela Demais; role para ver a cotação, a data e o histórico" tabIndex={0}>
        <table className="oil-eia-table" aria-label="Demais instrumentos - referências independentes"><thead><tr><th scope="col">Instrumento</th><th scope="col">Cotação <small>USD/barril</small></th><th scope="col">Data da observação</th><th scope="col">Histórico</th></tr></thead>
          <tbody><tr><th scope="row">Brent spot · EIA</th><td><button type="button" className="oil-details oil-spot-value" aria-label="Brent spot EIA: abrir histórico" onClick={() => setExpanded(true)}>{latest ? latest.value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</button></td><td>{latest ? <time dateTime={latest.date}>{latest.date.split('-').reverse().join('/')}</time> : '—'}</td><td><button type="button" className="oil-details" aria-label="Petróleo Brent: abrir histórico" onClick={() => setExpanded(true)}>Histórico EIA ›</button></td></tr></tbody>
        </table>
      </div>
      <p className="chart-basis">Brent spot · EIA · divulgação defasada, não é tempo real. Preço de mercado publicado pela EIA, originado de Refinitiv/LSEG; não é preço fixado pelo governo. <a href="https://www.eia.gov/dnav/pet/hist/RBRTED.htm" target="_blank" rel="noreferrer">Fonte e série oficial</a>. {typeof data?.releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.releaseDate) && <>Publicação: {data.releaseDate.split('-').reverse().join('/')}. </>}{typeof data?.nextReleaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.nextReleaseDate) && <>Próxima divulgação prevista: {data.nextReleaseDate.split('-').reverse().join('/')}. </>}</p>
      {(!latest || status.pending) && <p className="status stale" role="status">{!latest ? state.error || data ? 'Referência EIA indisponível.' : 'Carregando referência EIA.' : status.label}</p>}
      <div className="oil-secondary-reference"><button type="button" className="oil-details" onClick={() => setLiveOpen(true)} aria-haspopup="dialog">Outra referência: CFD indicativo</button><small>TradingView · USD/barril · atraso não informado. Série independente do spot EIA.</small></div>
    </section> : <article className="tile oil-tile" aria-label="Petróleo Brent CFD indicativo">
      <div className="tile-head"><span className="tile-name"><b>Petróleo Brent</b></span><button type="button" className="oil-details" aria-label="Petróleo Brent: abrir histórico" onClick={() => setExpanded(true)}>Histórico EIA ›</button></div>
      <OilLiveQuote />
    </article>}
    {liveOpen && <Expandable modal label="Referência online Brent" onClose={() => setLiveOpen(false)}><h2>Brent — CFD indicativo</h2><OilLiveQuote /></Expandable>}
    {expanded && <OilHistory data={data} points={points} spark={spark} dates={dates} presets={presets} onDates={onDates} onPreset={onPreset} dateError={dateError} stale={status.pending} loading={!data && !state.error} onClose={() => setExpanded(false)} />}
  </>
}
