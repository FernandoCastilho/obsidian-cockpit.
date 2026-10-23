import { useEffect, useState } from 'react'
import OilHistory from './OilHistory.jsx'
import OilLiveQuote from './OilLiveQuote.jsx'
import { oilStatus } from './oilStatus.js'

// Commodity independente: nunca entra no câmbio ou nos cálculos em reais.
export default function OilTile({ spark, dates, presets, onDates, onPreset, dateError }) {
  const [expanded, setExpanded] = useState(false)
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
  return <>
    <article className="tile oil-tile" aria-label="Petróleo Brent CFD indicativo">
      <div className="tile-head"><span className="tile-name"><b>Petróleo Brent</b> <small>· online</small></span></div>
      <OilLiveQuote />
      <button type="button" className="oil-details" aria-label="Petróleo Brent: abrir histórico" onClick={() => setExpanded(true)}>Detalhes e histórico spot EIA ›</button>
    </article>
    {expanded && <OilHistory data={data} points={points} spark={spark} dates={dates} presets={presets} onDates={onDates} onPreset={onPreset} dateError={dateError} stale={status.pending} loading={!data && !state.error} onClose={() => setExpanded(false)} />}
  </>
}
