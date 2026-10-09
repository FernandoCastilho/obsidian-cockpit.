import { useEffect, useMemo, useRef, useState } from 'react'
import { useHistory, useIntraday } from './useHistory.js'

const H = 240
const M = { t: 12, r: 16, b: 28, l: 58 }

export const fmtDate = (t, long) =>
  new Date(t).toLocaleDateString('pt-BR', long ? { day: '2-digit', month: 'short', year: 'numeric' } : { day: '2-digit', month: '2-digit' })
export const fmtTime = (t, sec) => new Date(t).toLocaleTimeString('pt-BR', sec ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : { hour: '2-digit', minute: '2-digit' })
const fmtMonth = (t) => new Date(t).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
const brl = (v, d = 4) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: d, maximumFractionDigits: d })

export function useWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(480)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.floor(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

export function Plot({ points, width, color, code, intraday, fmt, label, nice }) {
  const [hover, setHover] = useState(null)
  const g = useMemo(() => {
    const t0 = points[0].t
    const t1 = points[points.length - 1].t
    const vals = points.map((p) => p.bid)
    let lo = Math.min(...vals)
    let hi = Math.max(...vals)
    const pad = (hi - lo || hi * 0.01) * 0.12
    lo -= pad
    hi += pad
    let stepNice = 0
    let decNice = 0
    if (nice) {
      // eixo com valores redondos (juros): passo 1, 2, 2,5 ou 5 × 10^k
      const raw = (hi - lo) / 4
      const mag = 10 ** Math.floor(Math.log10(raw))
      stepNice = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((st) => st >= raw)
      decNice = Math.max(0, -Math.floor(Math.log10(mag)) + (Math.abs(stepNice / mag - 2.5) < 1e-9 ? 1 : 0))
      lo = Math.floor(lo / stepNice) * stepNice
      hi = Math.ceil(hi / stepNice) * stepNice
    }
    const iw = width - M.l - M.r
    const ih = H - M.t - M.b
    const x = (t) => M.l + (t1 === t0 ? iw / 2 : ((t - t0) / (t1 - t0)) * iw)
    const y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * ih
    const dec = nice ? decNice : Math.min(5, Math.max(2, Math.ceil(-Math.log10((hi - lo) / 4)) + 1))
    const yTicks = nice ? Array.from({ length: Math.round((hi - lo) / stepNice) + 1 }, (_, i) => lo + i * stepNice) : Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4)
    const nx = width < 420 ? 3 : 5
    const xTicks = Array.from({ length: nx }, (_, i) => t0 + ((t1 - t0) * i) / (nx - 1))
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.bid).toFixed(1)}`).join('')
    const base = H - M.b
    const area = `${line}L${x(t1).toFixed(1)},${base}L${x(t0).toFixed(1)},${base}Z`
    return { t0, t1, x, y, dec, yTicks, xTicks, line, area, base, long: t1 - t0 > 200 * 864e5, years: t1 - t0 > 3 * 365 * 864e5 }
  }, [points, width])

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    let best = 0
    let bd = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(g.x(p.t) - px)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    setHover(best)
  }

  const last = points[points.length - 1]
  const hp = hover != null ? points[hover] : null
  const gid = `a-${code}`

  return (
    <div className="plot" onPointerLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${width} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`Gráfico de linha de ${label ?? `${code}/BRL`}, de ${intraday ? fmtTime(g.t0) : fmtDate(g.t0, true)} a ${intraday ? fmtTime(g.t1) : fmtDate(g.t1, true)}`}
        onPointerMove={onMove}
        onPointerDown={onMove}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {g.yTicks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={width - M.r} y1={g.y(v)} y2={g.y(v)} className="gridline" />
            <text x={M.l - 8} y={g.y(v)} dy="0.32em" textAnchor="end" className="tick">
              {v.toLocaleString('pt-BR', { minimumFractionDigits: g.dec, maximumFractionDigits: g.dec })}
            </text>
          </g>
        ))}
        {g.xTicks.map((t, i) => (
          <text
            key={t}
            x={g.x(t)}
            y={H - 8}
            textAnchor={i === 0 ? 'start' : i === g.xTicks.length - 1 ? 'end' : 'middle'}
            className="tick"
          >
            {intraday ? fmtTime(t) : g.years ? new Date(t).getFullYear() : g.long ? fmtMonth(t) : fmtDate(t)}
          </text>
        ))}
        <path d={g.area} fill={`url(#${gid})`} />
        <path d={g.line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={g.x(last.t)} cy={g.y(last.bid)} r="4" fill={color} className="ring" />
        {hp && (
          <g pointerEvents="none">
            <line x1={g.x(hp.t)} x2={g.x(hp.t)} y1={M.t} y2={g.base} className="cross" />
            <circle cx={g.x(hp.t)} cy={g.y(hp.bid)} r="5" fill={color} className="ring" />
          </g>
        )}
      </svg>
      {hp && (
        <div className="tip" style={{ left: `${Math.min(Math.max((g.x(hp.t) / width) * 100, 18), 82)}%` }}>
          <strong>{intraday ? fmtTime(hp.t, true) : fmtDate(hp.t, true)}</strong>
          {fmt ? (
            <span>{label} {fmt(hp.bid)}</span>
          ) : intraday ? (
            <span>Compra {brl(hp.bid)} · Venda {brl(hp.ask)}</span>
          ) : (
            <>
              <span>Fechamento {brl(hp.bid)}</span>
              <span>Máx. {brl(hp.high)} · Mín. {brl(hp.low)}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function useSeries(currency, start, end, day) {
  // hooks sempre chamados; só um deles usado por modo
  const daily = useHistory(currency.code, start, end, !!day)
  const intra = useIntraday(currency.code, day ?? start, !day)
  return day ? intra : daily
}

export default function HistoryChart({ currency, color, start, end, day }) {
  const intraday = !!day
  const h = useSeries(currency, start, end, day)
  const [ref, width] = useWidth()
  const pts = h.status === 'ok' ? h.data.points : null
  const first = pts?.[0]
  const last = pts?.[pts.length - 1]
  const pct = first && last ? ((last.bid - first.bid) / first.bid) * 100 : null
  const trend = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'

  return (
    <article className="chart" style={{ '--series': color }}>
      <header>
        <h3>
          <i className="swatch" /> {h.data?.source ?? currency.code}/BRL
          <small>{currency.name}</small>
        </h3>
        {pct != null && (
          <div className={`pct ${trend}`}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '■'} {pct.toFixed(2).replace('.', ',')}%
            <small>{intraday ? 'no dia' : 'no período'}</small>
          </div>
        )}
      </header>
      <div ref={ref}>
        {h.status === 'loading' && <div className="placeholder" style={{ height: H }}>Carregando…</div>}
        {h.status === 'error' && (
          <div className="placeholder err" style={{ height: H }}>
            Não foi possível carregar o histórico.<br />
            <small>{h.error}</small>
          </div>
        )}
        {pts && <Plot points={pts} width={width} color={color} code={currency.code} intraday={intraday} fmt={intraday ? brl : undefined} label={intraday ? 'Cotação' : undefined} />}
      </div>
      {pts && intraday && (
        <p className="status">
          Barras de 5 min · atualizado às {new Date(h.data.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (a cada hora) · Fonte: Yahoo Finance
        </p>
      )}
      {pts && (
        <details className="table">
          <summary>Ver tabela ({pts.length} {intraday ? 'barras de 5 min' : 'dias'})</summary>
          <div className="scroll">
            <table>
              <thead>
                {intraday ? <tr><th>Hora</th><th>Cotação</th></tr> : <tr><th>Data</th><th>Fechamento</th><th>Máx.</th><th>Mín.</th></tr>}
              </thead>
              <tbody>
                {[...pts].reverse().map((p) => (
                  <tr key={p.t}>
                    {intraday ? (
                      <><td>{fmtTime(p.t, true)}</td><td>{brl(p.bid)}</td></>
                    ) : (
                      <><td>{fmtDate(p.t, true)}</td><td>{brl(p.bid)}</td><td>{brl(p.high)}</td><td>{brl(p.low)}</td></>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </article>
  )
}
