import { useMemo, useState } from 'react'
import { Plot, fmtDate, fmtTime, useWidth } from './HistoryChart.jsx'
import { mergeDaily, mergeTicks } from './parity.js'
import { useHistory, useIntraday } from './useHistory.js'

const num = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })

function useParity(start, end, day, invert) {
  const usdD = useHistory('USD', start, end, !!day)
  const eurD = useHistory('EUR', start, end, !!day)
  const usdI = useIntraday('USD', day ?? start, !day)
  const eurI = useIntraday('EUR', day ?? start, !day)
  const [a, b] = day ? [usdI, eurI] : [usdD, eurD]
  return useMemo(() => {
    if (a.status === 'error' || b.status === 'error') return { status: 'error', error: [a.error, b.error].filter(Boolean).join(' · ') }
    if (a.status !== 'ok' || b.status !== 'ok') return { status: 'loading' }
    const merge = day ? mergeTicks : mergeDaily
    const points = merge(a.data.points, b.data.points, invert)
    return points.length > 1 ? { status: 'ok', points } : { status: 'error', error: 'sem cotações em comum no período' }
  }, [a, b, day, invert])
}

export default function ParityChart({ color, start, end, day }) {
  const [invert, setInvert] = useState(true) // padrão de mercado: EUR/USD (dólares por 1 euro)
  const s = useParity(start, end, day, invert)
  const [ref, width] = useWidth()
  const intraday = !!day
  const label = invert ? 'EUR/USD' : 'USD/EUR'
  const prefix = invert ? 'US$' : '€'
  const fmt = (v) => `${prefix} ${num(v)}`
  const pts = s.status === 'ok' ? s.points : null
  const pct = pts ? ((pts[pts.length - 1].bid - pts[0].bid) / pts[0].bid) * 100 : null
  const trend = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'

  return (
    <article className="chart wide" style={{ '--series': color }}>
      <header>
        <h3>
          <i className="swatch" /> {label}
          <small>{invert ? 'Dólares por 1 euro' : 'Euros por 1 dólar'} · paridade</small>
        </h3>
        <div className="parity-actions">
          <button type="button" className="btn small" onClick={() => setInvert((v) => !v)} title="Inverte a paridade">
            Ver {invert ? 'USD/EUR' : 'EUR/USD'}
          </button>
          {pct != null && (
            <div className={`pct ${trend}`}>
              {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '■'} {pct.toFixed(2).replace('.', ',')}%
              <small>{intraday ? 'no dia' : 'no período'}</small>
            </div>
          )}
        </div>
      </header>
      <div ref={ref}>
        {s.status === 'loading' && <div className="placeholder" style={{ height: 240 }}>Carregando…</div>}
        {s.status === 'error' && (
          <div className="placeholder err" style={{ height: 240 }}>
            Não foi possível calcular a paridade.<br />
            <small>{s.error}</small>
          </div>
        )}
        {pts && <Plot points={pts} width={width} color={color} code={label} intraday={intraday} fmt={fmt} label={label} />}
      </div>
      {pts && (
        <details className="table">
          <summary>Ver tabela ({pts.length} {intraday ? 'cotações' : 'dias'})</summary>
          <div className="scroll">
            <table>
              <thead><tr><th>{intraday ? 'Hora' : 'Data'}</th><th>{label}</th></tr></thead>
              <tbody>
                {[...pts].reverse().map((p) => (
                  <tr key={p.t}><td>{intraday ? fmtTime(p.t, true) : fmtDate(p.t, true)}</td><td>{fmt(p.bid)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </article>
  )
}
