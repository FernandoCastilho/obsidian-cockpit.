import { useMemo, useState } from 'react'
import Explain from './Explain.jsx'
import { useWidth } from './HistoryChart.jsx'

const H = 260
const M = { t: 14, r: 16, b: 30, l: 52 }
const SHADES = ['#4aa3a2', '#e6b34a', '#a98bd6', '#d55181', '#6fa8dc', '#9bbf5a', '#c0c0c0']
const pct = (v) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
const day = (iso) => iso.split('-').reverse().join('/')

// Eixo X: BR em anos úteis (day252 / 252), EUA em posições iguais por vencimento.
function CurveChart({ title, subtitle, data, mode, source, help }) {
  const [ref, width] = useWidth()
  const [off, setOff] = useState(() => new Set())
  const [hover, setHover] = useState(null)
  const compare = data?.compare ?? []
  const shown = compare.filter((c) => !off.has(c.date))

  const g = useMemo(() => {
    if (!shown.length) return null
    const series = shown.map((c) => ({ ...c, pts: data.curves[c.date] }))
    const labels = mode === 'us' ? [...new Map(series.flatMap((s) => s.pts.map((p) => [p[0], p[2]]))).entries()].sort((a, b) => a[0] - b[0]) : null
    const xv = (yrs) => (labels ? labels.findIndex((l) => l[0] === yrs) : yrs)
    const x0 = 0
    const x1 = labels ? labels.length - 1 : Math.max(...series.flatMap((s) => s.pts.map((p) => p[0] / 252)))
    const vals = series.flatMap((s) => s.pts.map((p) => p[1]))
    let lo = Math.min(...vals)
    let hi = Math.max(...vals)
    const pad = (hi - lo || 1) * 0.12
    lo -= pad
    hi += pad
    const iw = width - M.l - M.r
    const ih = H - M.t - M.b
    const X = (p) => M.l + (((labels ? xv(p[0]) : p[0] / 252) - x0) / (x1 - x0 || 1)) * iw
    const Y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * ih
    const yTicks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4)
    const xTicks = labels
      ? labels.filter((_, i) => i % (width < 520 ? 3 : 2) === 0 || i === labels.length - 1).map((l) => ({ x: X([l[0]]), t: l[1] }))
      : [0, 1, 2, 3, 5, 7, 10].filter((y) => y <= x1 + 0.01).map((y) => ({ x: M.l + (y / (x1 || 1)) * iw, t: `${y}a` }))
    return { series, X, Y, yTicks, xTicks }
  }, [shown.map((s) => s.date).join(), width, data, mode])

  const onMove = (e) => {
    if (!g) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const pts = g.series[0].pts
    let best = 0
    let bd = Infinity
    pts.forEach((p, i) => {
      const d = Math.abs(g.X(p) - px)
      if (d < bd) ((bd = d), (best = i))
    })
    setHover(best)
  }

  const hp = g && hover != null ? g.series[0].pts[hover] : null
  const vertexLabel = (p) => (mode === 'us' ? p[2] : `${Math.round(p[0])} d.u. (~${(p[0] / 21).toFixed(1).replace('.', ',')} m)`)
  const at = (s, p) => (mode === 'us' ? s.pts.find((q) => q[0] === p[0]) : s.pts.reduce((b, q) => (Math.abs(q[0] - p[0]) < Math.abs(b[0] - p[0]) ? q : b)))

  return (
    <article className="chart curve">
      <header>
        <h3>
          {title}
          <small>{subtitle}</small>
          <Explain id={help} />
        </h3>
      </header>
      <div className="curve-legend">
        {compare.map((c, i) => (
          <button key={c.date} type="button" className={off.has(c.date) ? 'off' : ''} style={{ '--series': SHADES[i % SHADES.length] }} onClick={() => setOff((o) => { const n = new Set(o); n.has(c.date) ? n.delete(c.date) : n.add(c.date); return n })}>
            <i className="swatch" /> {c.label} <small>{day(c.date)}</small>
          </button>
        ))}
      </div>
      <div ref={ref}>
        {g ? (
          <div className="plot" onPointerLeave={() => setHover(null)}>
            <svg viewBox={`0 0 ${width} ${H}`} width="100%" height={H} role="img" aria-label={`Curva de juros: ${title}`} onPointerMove={onMove} onPointerDown={onMove}>
              {g.yTicks.map((v) => (
                <g key={v}>
                  <line x1={M.l} x2={width - M.r} y1={g.Y(v)} y2={g.Y(v)} className="gridline" />
                  <text x={M.l - 8} y={g.Y(v)} dy="0.32em" textAnchor="end" className="tick">{v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</text>
                </g>
              ))}
              {g.xTicks.map((t, i) => (
                <text key={t.t + i} x={t.x} y={H - 8} textAnchor="middle" className="tick">{t.t}</text>
              ))}
              {g.series.map((s) => {
                const color = SHADES[compare.findIndex((c) => c.date === s.date) % SHADES.length]
                const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${g.X(p).toFixed(1)},${g.Y(p[1]).toFixed(1)}`).join('')
                return <path key={s.date} d={d} fill="none" stroke={color} strokeWidth={s.id === 'hoje' ? 2.5 : 1.6} strokeLinejoin="round" strokeLinecap="round" opacity={s.id === 'hoje' ? 1 : 0.85} />
              })}
              {hp && <line x1={g.X(hp)} x2={g.X(hp)} y1={M.t} y2={H - M.b} className="cross" pointerEvents="none" />}
            </svg>
            {hp && (
              <div className="tip" style={{ left: `${Math.min(Math.max((g.X(hp) / width) * 100, 20), 80)}%` }}>
                <strong>{vertexLabel(hp)}</strong>
                {g.series.map((s) => {
                  const q = at(s, hp)
                  return q ? <span key={s.date}>{s.label}: {pct(q[1])}</span> : null
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="placeholder" style={{ height: H }}>Selecione ao menos uma data.</div>
        )}
      </div>
      <p className="status">{source}</p>
    </article>
  )
}

export default function Curves({ curves: c }) {
  const d = c.data
  return (
    <section className="macro" aria-labelledby="curves-h">
      <h2 id="curves-h">Curvas de juros</h2>
      {c.status === 'loading' && <div className="placeholder">Carregando curvas…</div>}
      {c.status === 'ok' && c.data.generatedAt && Date.now() - c.data.generatedAt > 3 * 3600e3 && (
        <p className="status stale">Atenção: as curvas foram coletadas há mais de 3 horas; a atualização automática pode ter parado.</p>
      )}
      {c.status === 'ok' && Object.keys(c.data.stale ?? {}).length > 0 && (
        <p className="status stale">
          Fonte indisponível na última atualização; mantido o último dado publicado: {Object.entries(c.data.stale).map(([k, t]) => `${{ br: 'DI x pré', cc: 'cupom cambial', us: 'Treasuries' }[k] ?? k} (coletado em ${t ? new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'data desconhecida'})`).join(', ')}.
        </p>
      )}
      {c.status === 'error' && <p className="status">Curvas de juros indisponíveis agora ({c.error}).</p>}
      {c.status === 'ok' && (
        <div className="charts">
          {d.br ? (
            <CurveChart help="curvaDi" title="Brasil · DI x pré" subtitle="B3, taxa % a.a. por prazo em dias úteis" data={d.br} mode="br" source="Fonte: B3, Taxas referenciais (DI x pré), calculadas a partir dos ajustes dos futuros de DI. Atualizado a cada hora; a B3 publica após o fechamento do pregão." />
          ) : (
            <p className="status">Curva DI indisponível nesta atualização.</p>
          )}
          {d.cc ? (
            <CurveChart help="cupom" title="Brasil · Cupom cambial" subtitle="B3, DI x dólar, % a.a. por prazo em dias úteis" data={d.cc} mode="br" source="Fonte: B3, Taxas referenciais (DI x dólar), cupom cambial a partir dos ajustes dos futuros. Vértices curtos (menos de 1 mês) omitidos por serem muito ruidosos. Atualizado a cada hora; a B3 publica após o fechamento." />
          ) : (
            <p className="status">Curva do cupom cambial indisponível nesta atualização.</p>
          )}
          {d.us ? (
            <CurveChart help="treasuries" title="EUA · Treasuries" subtitle="Par yield curve, % a.a. por vencimento" data={d.us} mode="us" source="Fonte: Departamento do Tesouro dos EUA (Daily Treasury Par Yield Curve Rates). É a curva de títulos públicos, não de futuros; fechamento do dia anterior ou do dia, conforme a divulgação." />
          ) : (
            <p className="status">Curva dos EUA indisponível nesta atualização.</p>
          )}
        </div>
      )}
    </section>
  )
}
