import { useMemo } from 'react'
import { Plot, useWidth } from './HistoryChart.jsx'
import { forwardCurve, horizonTable } from './cdiFuturo.js'

const pct = (v) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
const dm = (iso) => iso.split('-').reverse().join('/')

// CDI futuro: taxa a termo implícita nos futuros de DI (curva DI x pré da B3), em % a.a., por data.
export default function CdiFuturo({ curves, macro }) {
  const [ref, width] = useWidth()
  const br = curves.data?.br
  const today = br?.compare?.find((c) => c.id === 'hoje')
  const pts = today ? br.curves[today.date] : null
  const cdi = macro?.cdi?.length ? macro.cdi[macro.cdi.length - 1] : null
  const series = useMemo(() => {
    if (!pts) return null
    const t0 = Date.parse(`${today.date}T12:00:00Z`)
    const f = forwardCurve(pts).map((p) => ({ t: t0 + (p.mid / 252) * 365 * 864e5, bid: p.rate }))
    if (cdi) f.unshift({ t: t0, bid: cdi[1] })
    return f.length >= 2 ? f : null
  }, [pts, today, cdi])
  const rows = useMemo(() => horizonTable(pts), [pts])

  return (
    <section className="macro" aria-labelledby="cdif-h">
      <h2 id="cdif-h">CDI futuro</h2>
      {curves.status === 'loading' && <div className="placeholder">Carregando curva DI…</div>}
      {curves.status !== 'loading' && !series && <p className="status">CDI futuro indisponível: depende da curva DI x pré da B3, que não veio na última atualização.</p>}
      {series && (
        <article className="chart">
          <header>
            <h3>
              CDI a termo implícito
              <small>% a.a., taxa entre vértices do DI; parte do CDI de hoje</small>
            </h3>
          </header>
          <div ref={ref}>
            <Plot points={series} width={width} color="#4aa3a2" code="cdif" fmt={pct} label="CDI futuro" nice />
          </div>
          <details className="table" open>
            <summary>Tabela por horizonte</summary>
            <div className="scroll">
            <table>
              <thead>
                <tr><th>Horizonte</th><th>CDI médio até lá</th><th>CDI a termo no trecho</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.d}>
                    <td>{r.label}</td>
                    <td>{pct(r.avg)}</td>
                    <td>{r.fwd != null ? pct(r.fwd) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </details>
          <p className="status">
            Fonte: B3, DI x pré de {dm(today.date)}. É o CDI que o mercado precifica, com prêmio de risco embutido, não uma projeção oficial. "CDI médio até lá" é a taxa composta do DI até o vértice; "a termo no trecho" é a taxa implícita entre o horizonte anterior e este. Para a visão de analistas, veja o Boletim Focus (Selic).
          </p>
        </article>
      )}
    </section>
  )
}
