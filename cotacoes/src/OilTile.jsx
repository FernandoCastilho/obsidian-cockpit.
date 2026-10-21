import { useEffect, useState } from 'react'
import Sparkline from './Sparkline.jsx'
import { oilPeriodPoints } from './summaryPeriod.js'

const SOURCE = 'https://www.eia.gov/dnav/pet/hist/RBRTED.htm'
const dateLabel = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date.split('-').reverse().join('/') : '—'

// Commodity independente: nunca entra no câmbio, na paridade ou nos cálculos em reais.
export default function OilTile({ spark }) {
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
  const last = points.at(-1)
  const previous = points.at(-2)
  const change = last && previous ? (last.value / previous.value - 1) * 100 : null
  const chart = oilPeriodPoints(points, spark).map((p) => ({ bid: p.value }))
  const overdue = data?.nextReleaseDate && new Date().toISOString().slice(0, 10) > data.nextReleaseDate
  return (
    <article className="tile oil-tile" aria-label="Petróleo Brent spot">
      <div className="tile-head"><span aria-hidden="true">🛢</span><span className="tile-name"><b>Petróleo Brent</b> <small>· spot</small></span></div>
      <div className="tile-body">
        <div className="tile-num">
          <span className="tile-price">{last ? `US$ ${last.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</span>
          <small>por barril</small>
          {change != null && <span className={`pct ${change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}`}>{change > 0 ? '+' : ''}{change.toFixed(2).replace('.', ',')}% <small className="muted">vs. última observação</small></span>}
        </div>
        {!spark.intraday && <span className="tile-spark"><Sparkline points={chart} /><small className="muted">{chart.length > 1 ? `${spark.label} · diário` : 'Sem série suficiente no período'}</small></span>}
      </div>
      <small className="muted">Referência: {dateLabel(last?.date)} · sem intraday</small>
      <small className="muted">Divulgação EIA: {dateLabel(data?.releaseDate)}</small>
      {(state.error || overdue) && <small role="status">{last ? 'Último dado disponível; atualização pendente.' : 'Cotação indisponível.'}</small>}
      <a href={SOURCE} target="_blank" rel="noreferrer" className="oil-source">Fonte: EIA · Brent spot FOB</a>
    </article>
  )
}
