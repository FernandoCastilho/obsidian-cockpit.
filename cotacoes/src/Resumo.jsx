import { comparisonSeries } from './comparisonSeries.js'
import Expandable from './Expandable.jsx'
import OilTile from './OilTile.jsx'
import { selectedPeriod } from './summaryPeriod.js'
import { useEffect, useState } from 'react'
import Explain from './Explain.jsx'
import Help from './Help.jsx'
import { CURRENCIES, seriesName } from './useQuotes.js'
import { fullWindow, toInput, useHistory, useIntraday } from './useHistory.js'
import { liveCross, mergeDaily, mergeTicks } from './parity.js'
import { periodChange } from './stats.js'
import { flagSvg } from './flags.js'
import { shareQuotesImage } from './shareImage.js'
import { rateTiles, topHeadlines } from './snapshot.js'
import { upcoming } from './agenda.js'
import { useNews } from './useNews.js'
import Sparkline from './Sparkline.jsx'
import { Plot, useWidth } from './HistoryChart.jsx'

const brl = (v, d = 4) => !Number.isFinite(v) ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}`
const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2).replace('.', ',')}%`
const p2 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const p4 = (v) => (Number.isFinite(v) ? v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—')
const bps = (d) => `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(Math.round(d * 100))} bps`
const SPARK = [
  { id: 'day', label: 'Dia', days: 1, intraday: true },
  { id: 'week', label: 'Semana', days: 7 },
  { id: 'month', label: 'Mês', days: 30 },
  { id: 'year', label: 'Ano', days: 359 },
]
const toneOf = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat')
const NAMES = { USD: 'Dólar', EUR: 'Euro', JPY: 'Iene', CNH: 'Yuan' }
const ago = (t) => {
  const min = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  return h < 24 ? `há ${h} h` : new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// Janela do minigráfico: recorte do histórico de 360 dias que já está em cache (sem consulta nova).
function useWindow(spark) {
  if (spark.range) return spark.range
  const days = spark.days
  const win = fullWindow()
  return { start: new Date(win.end.getTime() - days * 864e5), end: win.end }
}

function Arrow({ v }) {
  return <span aria-hidden="true">{v > 0 ? '▲' : v < 0 ? '▼' : '■'}</span>
}

// Hora da cotação: só a hora se for de hoje; com o dia, se for de outro dia.
const when = (t) => {
  if (!Number.isFinite(t)) return 'data desconhecida'
  const d = new Date(t)
  const today = new Date().toDateString() === d.toDateString()
  return d.toLocaleString('pt-BR', today ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Faixa do dia: onde a cotação atual está entre a mínima e a máxima do dia (só com máx./mín. da fonte).
export function rangePosition(q) {
  if (!q || !(q.high > 0) || !(q.low > 0) || !(q.bid > 0) || q.high < q.low) return null
  if (q.high === q.low) return 0.5
  return Math.min(1, Math.max(0, (q.bid - q.low) / (q.high - q.low)))
}
function DayRange({ quote, fmt }) {
  const pos = rangePosition(quote)
  if (pos == null) return <span className="qt-range is-empty" aria-hidden="true" />
  const text = `Faixa do dia: mínima ${fmt(quote.low)} · máxima ${fmt(quote.high)}`
  return (
    <span className="qt-range" title={text} role="img" aria-label={text}>
      <span className="qt-range-mark" style={{ left: `${(pos * 100).toFixed(1)}%` }} />
    </span>
  )
}

// Quadro da moeda: preço, variação do dia, faixa do dia e minigráfico do período. Detalhes ficam no toque (gráfico completo)
// e nas dicas de passar o mouse; o quadro mostra só o essencial.
function Tile({ code, quote, ptax, spark, onOpen, color }) {
  const w = useWindow(spark)
  const h = useHistory(code, w.start, w.end, !!spark.intraday)
  const i = useIntraday(code, new Date(), !spark.intraday)
  const s = spark.intraday ? i : h
  const pts = s.status === 'ok' ? s.data.points : []
  const change = periodChange(pts)
  const hasDay = !!quote && !quote.fallback // a fonte reserva (BCE) não traz a variação do dia
  const day = hasDay ? quote.pct ?? 0 : 0
  const trend = toneOf(hasDay ? day : change)
  const cur = CURRENCIES.find((c) => c.code === code)
  const pair = `${quote?.source ?? code}/BRL${code === 'CNH' && quote?.source === 'CNH' ? ' offshore' : ''}`
  const state = quote?.stale ? 'Atualização pendente' : quote?.fallback ? 'Reserva BCE' : null
  const stateTip = quote?.stale ? 'A última consulta falhou; mantida a cotação anterior.' : 'Fonte principal indisponível: referência diária do BCE, sem compra/venda nem variação do dia.'
  const histWarn = s.stale || s.warning
  return (
    <button type="button" style={{ '--series': color }} className="tile qt" onClick={() => onOpen(code)} aria-label={`${cur.name}: detalhes`}>
      <span className="qt-head">
        <span className="flag" aria-hidden="true" dangerouslySetInnerHTML={{ __html: flagSvg(code, 'width="22" height="15"') }} />
        <b className="qt-name">{NAMES[code]}</b>
        <span className="qt-pair">{pair}</span>
        {hasDay ? (
          <span className={`qt-chg ${trend}`} title="Variação do dia">
            <Arrow v={day} /> {pct(day)}
          </span>
        ) : (
          quote && <span className="qt-chg flat" title="Variação do dia indisponível na fonte de reserva">—</span>
        )}
      </span>
      <span className="qt-price">{quote ? brl(quote.bid) : '—'}</span>
      <DayRange quote={quote} fmt={(v) => brl(v)} />
      <span className="qt-spark" title={histWarn ? 'Histórico: não foi possível atualizar; mantida a última série.' : undefined}>
        <Sparkline points={pts} tone={change != null ? toneOf(change) : trend} height={40} />
      </span>
      <span className="qt-foot">
        <span className={state ? 'qt-state' : undefined} title={state ? stateTip : `Última cotação: ${quote && Number.isFinite(quote.timestamp) ? new Date(quote.timestamp).toLocaleString('pt-BR') : '—'}`}>
          {state ? `${state} · ` : ''}{quote ? when(quote.timestamp) : '—'}
        </span>
        {ptax && <span title={`PTAX de venda (${ptax.kind ?? 'BCB'})`}>PTAX {p4(ptax.sell)}</span>}
        <span className="qt-period" title={`Variação no período do minigráfico (${spark.label})`}>
          {spark.label} {change != null ? <b className={toneOf(change)}>{pct(change)}</b> : <span className="muted">—</span>}
          {histWarn && <i className="qt-warn" aria-label="histórico desatualizado" />}
        </span>
      </span>
    </button>
  )
}

// Paridade entre duas moedas à escolha: base à esquerda, cotada à direita (padrão EUR/USD, convenção de mercado).
// Valor ao vivo e minigráfico saem das séries em reais de cada moeda.
const cross = (v, q) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: v >= 100 ? 2 : v >= 1 ? 4 : 6, maximumFractionDigits: v >= 100 ? 2 : v >= 1 ? 4 : 6 })} ${q}`
function PairSelect({ value, onChange, label }) {
  return (
    <select className="pair-sel" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
    </select>
  )
}
function ParityTile({ quotes, spark, onOpen, color }) {
  const [base, setBase] = useState('EUR')
  const [quote, setQuote] = useState('USD')
  const pick = (which, v) => {
    // moedas iguais não fazem paridade: troca a outra ponta
    if (which === 'base') {
      if (v === quote) setQuote(base)
      setBase(v)
    } else {
      if (v === base) setBase(quote)
      setQuote(v)
    }
  }
  const w = useWindow(spark)
  const dia = !!spark.intraday
  const bh = useHistory(base, w.start, w.end, dia)
  const qh = useHistory(quote, w.start, w.end, dia)
  const bi = useIntraday(base, new Date(), !dia)
  const qi = useIntraday(quote, new Date(), !dia)
  const [a, b] = dia ? [qi, bi] : [qh, bh]
  const pts = a.status === 'ok' && b.status === 'ok' ? (dia ? mergeTicks : mergeDaily)(a.data.points, b.data.points, true) : []
  const change = periodChange(pts)
  const p = liveCross(quotes?.[base], quotes?.[quote])
  const hasDay = !!p && !quotes[base].fallback && !quotes[quote].fallback
  const trend = toneOf(hasDay ? p.pct : change)
  const eurUsd = base === 'EUR' && quote === 'USD'
  const [big, setBig] = useState(false)
  return (
    <>
    <div style={{ '--series': color }} className="tile qt pair-tile">
      <span className="qt-head">
        <PairSelect value={base} onChange={(v) => pick('base', v)} label="Moeda base" />
        <span className="pair-slash" aria-hidden="true">/</span>
        <PairSelect value={quote} onChange={(v) => pick('quote', v)} label="Moeda cotada" />
        {hasDay ? (
          <span className={`qt-chg ${trend}`} title="Variação do dia">
            <Arrow v={p.pct} /> {pct(p.pct)}
          </span>
        ) : (
          p && <span className="qt-chg flat" title="Variação do dia indisponível">—</span>
        )}
      </span>
      <button type="button" className="qt-price qt-price-btn" onClick={() => (eurUsd ? onOpen('PAR') : pts.length > 1 && setBig(true))} title="Abrir gráfico da paridade">
        {p ? cross(p.main, quote) : '—'}
      </button>
      <span className="qt-range is-empty" aria-hidden="true" />
      <span className="qt-spark expandable" role="button" title="Ampliar" onClick={() => pts.length > 1 && setBig(true)}>
        <Sparkline points={pts} tone={change != null ? toneOf(change) : trend} height={40} />
      </span>
      <span className="qt-foot">
        <span title={(a.stale || b.stale) ? 'Calculada com a última série disponível' : 'Cruzamento das cotações em reais'}>{NAMES[quote]} por 1 {NAMES[base].toLowerCase()}</span>
        <span className="qt-period" title={`Variação no período do minigráfico (${spark.label})`}>
          {spark.label} {change != null ? <b className={toneOf(change)}>{pct(change)}</b> : <span className="muted">—</span>}
          {(a.stale || b.stale) && <i className="qt-warn" aria-label="série desatualizada" />}
        </span>
      </span>
    </div>
    {big && (
      <Overlay onClose={() => setBig(false)}>
        <div className="resumo-chart big">
          <h3>{base}/{quote} <small className="muted">· {spark.label}</small>{change != null && <span className={`pct ${toneOf(change)}`}> {pct(change)}</span>}</h3>
          {(a.stale || b.stale) && <p className="status stale" role="status">Não foi possível atualizar. Paridade calculada com a última série disponível.</p>}
          <Wide render={(wv) => <Plot points={pts} width={wv} color={color} code={`par-${base}-${quote}-${spark.id}`} intraday={dia} fmt={(v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} vfmt={(v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} labels label={`${base}/${quote}`} />} />
        </div>
      </Overlay>
    )}
    </>
  )
}

// Último valor (%) no fim de cada linha, afastado na vertical para os rótulos não se sobreporem.
function endLabels(norm, y) {
  const items = norm.map((s) => ({ code: s.code, color: s.color, y: y(s.pts.at(-1).v), text: pct(s.pts.at(-1).v) })).sort((a, b) => a.y - b.y)
  for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < 13) items[i].y = items[i - 1].y + 13
  return items
}

// Linhas sobrepostas em variação % desde o início do período (escalas diferentes ficam comparáveis).
function MultiPlot({ series, width, intraday }) {
  const H = 240
  const M = { t: 12, r: 64, b: 28, l: 52 }
  const [hover, setHover] = useState(null)
  const norm = series.map((s) => ({ ...s, pts: s.points.map((p) => ({ t: p.t, v: (p.bid / s.points[0].bid - 1) * 100, bid: p.bid })) }))
  const all = norm.flatMap((s) => s.pts)
  const t0 = Math.min(...all.map((p) => p.t))
  const t1 = Math.max(...all.map((p) => p.t))
  let lo = Math.min(0, ...all.map((p) => p.v))
  let hi = Math.max(0, ...all.map((p) => p.v))
  const pad = Math.max(hi - lo, 0.2) * 0.12
  lo -= pad
  hi += pad
  const iw = width - M.l - M.r
  const ih = H - M.t - M.b
  const x = (t) => M.l + (t1 === t0 ? iw / 2 : ((t - t0) / (t1 - t0)) * iw)
  const y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * ih
  const yTicks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4)
  const nx = width < 420 ? 3 : 5
  const xTicks = Array.from({ length: nx }, (_, i) => t0 + ((t1 - t0) * i) / (nx - 1))
  const fmtX = (t) => (intraday ? new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }))
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * width
    setHover(t0 + ((px - M.l) / iw) * (t1 - t0))
  }
  const at = (s, t) => s.pts.reduce((b, p) => (Math.abs(p.t - t) < Math.abs(b.t - t) ? p : b), s.pts[0])
  return (
    <svg className="hist-svg" viewBox={`0 0 ${width} ${H}`} width="100%" role="img" aria-label="Variação percentual das moedas selecionadas no período" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }}>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={M.l} x2={width - M.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={M.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--mut)">{pct(v)}</text>
        </g>
      ))}
      <line x1={M.l} x2={width - M.r} y1={y(0)} y2={y(0)} stroke="var(--mut)" strokeDasharray="4 3" />
      {xTicks.map((t, i) => (
        <text key={i} x={x(t)} y={H - 8} textAnchor={i === 0 ? 'start' : i === nx - 1 ? 'end' : 'middle'} fontSize="11" fill="var(--mut)">{fmtX(t)}</text>
      ))}
      {norm.map((s) => (
        <path key={s.code} d={s.pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
      ))}
      {endLabels(norm, y).map((l) => (
        <text key={l.code} x={width - M.r + 6} y={l.y} dy="0.32em" fontSize="11" fontWeight="700" fill={l.color} pointerEvents="none">{l.text}</text>
      ))}
      {hover != null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} stroke="var(--mut)" />
          {norm.map((s) => {
            const p = at(s, hover)
            return <circle key={s.code} cx={x(p.t)} cy={y(p.v)} r="3.5" fill={s.color} />
          })}
          {(() => {
            const bw = 150, bh = 22 + norm.length * 18
            const hx = x(hover)
            const bx = hx + 10 + bw > width - 4 ? hx - 10 - bw : hx + 10
            const p0 = at(norm[0], hover)
            return (
              <g pointerEvents="none">
                <rect x={bx} y={M.t} width={bw} height={bh} rx="8" fill="var(--pop-bg)" stroke="var(--line)" opacity="0.96" />
                <text x={bx + 10} y={M.t + 16} fontSize="11" fill="var(--mut)">{intraday ? new Date(p0.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date(p0.t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</text>
                {norm.map((s, k) => {
                  const p = at(s, hover)
                  const d = s.code === 'JPY' ? 4 : 4
                  return (
                    <text key={s.code} x={bx + 10} y={M.t + 34 + k * 18} fontSize="12" fill="var(--fg)">
                      <tspan fill={s.color} fontWeight="700">{s.code}</tspan>
                      <tspan dx="6">{p.bid.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}</tspan>
                      <tspan dx="6" fill={p.v > 0 ? 'var(--up)' : p.v < 0 ? 'var(--down)' : 'var(--mut)'}>{pct(p.v)}</tspan>
                    </text>
                  )
                })}
              </g>
            )
          })()}
        </g>
      )}
    </svg>
  )
}

// Gráfico do Resumo: moedas escolhidas nos botões (várias ao mesmo tempo) e o período dos botões Dia/Semana/Mês/Ano.

// Tela ampliada (mesmo visual do detalhe das moedas).
function Overlay({ onClose, children }) {
  useEffect(() => {
    const onKey = (ev) => ev.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll') }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(ev) => ev.stopPropagation()}>
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Fechar">×</button>
        {children}
      </div>
    </div>
  )
}

// Mede a largura disponível e desenha o gráfico nela.
function Wide({ render }) {
  const [ref, width] = useWidth()
  return <div ref={ref}>{width > 0 ? render(width) : null}</div>
}

function ResumoChart({ colors, spark }) {
  const [sel, setSel] = useState(['USD'])
  const w = useWindow(spark)
  const dia = !!spark.intraday
  // hooks em número fixo (uma consulta por moeda; ficam em cache)
  const hs = CURRENCIES.map((c) => useHistory(c.code, w.start, w.end, dia)) // eslint-disable-line react-hooks/rules-of-hooks
  const is = CURRENCIES.map((c) => useIntraday(c.code, new Date(), !dia)) // eslint-disable-line react-hooks/rules-of-hooks
  const [ref, width] = useWidth()
  const toggle = (code) => setSel((s) => (s.includes(code) ? (s.length > 1 ? s.filter((c) => c !== code) : s) : CURRENCIES.map((c) => c.code).filter((c) => c === code || s.includes(c))))
  const rows = CURRENCIES.map((c, k) => {
    const st = dia ? is[k] : hs[k]
    return { code: c.code, color: colors?.[c.code], st, points: st.status === 'ok' ? st.data.points : [], source: st.data?.source }
  }).filter((r) => sel.includes(r.code))
  const { available: ready, comparable, incomplete } = comparisonSeries(rows)
  const staleCodes = rows.filter((r) => r.st.stale).map((r) => r.code)
  // Detalhe de séries incompletas vai para a dica (i): a área do gráfico mostra só a mensagem curta.
  const incompleteNote = incomplete.length > 0 && (
    <Help label="Por que faltam pontos" icon="i" align="right">
      {incomplete.map((r) => <span key={r.code} className="ex">{`${r.code}: ${r.points.length === 1 ? `uma cotação no período (${brl(r.points[0].bid)}); aguardando outra para calcular variação` : r.st.error || 'aguardando cotações'}`}</span>)}
    </Help>
  )
  const staleNote = staleCodes.length > 0 && <p className="status stale" role="status">Não foi possível atualizar {staleCodes.join(', ')}. Mantida a última série disponível.</p>
  const failed = rows.every((r) => r.st.status === 'error')
  const one = rows.length === 1
  const r0 = rows[0]
  const chg = (r) => periodChange(r.points)
  const [big, setBig] = useState(false)
  const chart = (wv) => (
        ready.length > 0 && (one || comparable.length > 0) ? (
          one ? (
            <Plot points={r0.points} width={wv} color={r0.color} code={`rs-${r0.code}-${spark.id}`} intraday={dia} fmt={(v) => brl(v)} vfmt={(v) => v.toLocaleString('pt-BR', { minimumFractionDigits: v < 0.1 ? 5 : 4, maximumFractionDigits: v < 0.1 ? 5 : 4 })} labels label={`${r0.source ?? r0.code}/BRL`} />
          ) : (
            <MultiPlot series={comparable} width={wv} intraday={dia} />
          )
        ) : (
          <div className="placeholder" style={{ height: 120 }}>
            {failed ? (dia ? 'Sem pontos hoje. A coleta roda nos dias úteis, das 9h30 às 18h.' : 'Histórico indisponível no momento.') : rows.some((r) => r.st.status === 'loading') ? 'Carregando…' : dia ? 'Sem pontos hoje. A coleta roda nos dias úteis, das 9h30 às 18h.' : 'Histórico indisponível no momento.'}
          </div>
        )
  )
  return (
    <>
    <div className="resumo-chart">
      <div className="sec-head">
        <div className="sec-head-l">
        <h3 className="expandable" onClick={() => setBig(true)} role="button" title="Ampliar">
          {one ? <>{`${r0.source ?? r0.code}/BRL`} <small className="muted">· {spark.label}</small>{chg(r0) != null && <span className={`pct ${toneOf(chg(r0))}`}> {pct(chg(r0))}</span>}</> : <>Variação no período <small className="muted">· {spark.label}</small></>}
          {' '}<span className="muted" aria-hidden="true">›</span>
        </h3>
        {incompleteNote}
        </div>
        <div className="chips" role="group" aria-label="Moedas do gráfico (escolha uma ou mais)">
          {CURRENCIES.map((c) => (
            <button key={c.code} type="button" aria-pressed={sel.includes(c.code)} style={sel.includes(c.code) ? { borderColor: colors?.[c.code] } : undefined} onClick={() => toggle(c.code)}>
              {sel.includes(c.code) && <i className="chip-dot" style={{ background: colors?.[c.code] }} aria-hidden="true" />}
              {c.code}
            </button>
          ))}
        </div>
      </div>
      {!one && (
        <p className="chart-legend">
          {rows.map((r) => (
            <span key={r.code}><i className="chip-dot" style={{ background: r.color }} aria-hidden="true" />{r.code} {chg(r) != null && <b className={`pct ${toneOf(chg(r))}`}>{pct(chg(r))}</b>}</span>
          ))}
        </p>
      )}
      {staleNote}
      <div ref={ref}>
        {chart(width)}
      </div>
    </div>
    {big && (
      <Overlay onClose={() => setBig(false)}>
        <div className="resumo-chart big">
      <div className="sec-head">
        <h3>
          {one ? <>{`${r0.source ?? r0.code}/BRL`} <small className="muted">· {spark.label}</small>{chg(r0) != null && <span className={`pct ${toneOf(chg(r0))}`}> {pct(chg(r0))}</span>}</> : <>Variação no período <small className="muted">· {spark.label}</small></>}
        </h3>
        <div className="chips" role="group" aria-label="Moedas do gráfico (escolha uma ou mais)">
          {CURRENCIES.map((c) => (
            <button key={c.code} type="button" aria-pressed={sel.includes(c.code)} style={sel.includes(c.code) ? { borderColor: colors?.[c.code] } : undefined} onClick={() => toggle(c.code)}>
              {sel.includes(c.code) && <i className="chip-dot" style={{ background: colors?.[c.code] }} aria-hidden="true" />}
              {c.code}
            </button>
          ))}
        </div>
      </div>
      {!one && (
        <p className="chart-legend">
          {rows.map((r) => (
            <span key={r.code}><i className="chip-dot" style={{ background: r.color }} aria-hidden="true" />{r.code} {chg(r) != null && <b className={`pct ${toneOf(chg(r))}`}>{pct(chg(r))}</b>}</span>
          ))}
        </p>
      )}
          {staleNote}
          <Wide render={chart} />
        </div>
      </Overlay>
    )}
    </>
  )
}

// Quadros das moedas com minigráfico e seletor de período (o seletor vale só para o câmbio).
function MoedasPanel({ quotes, ptax, onOpen, colors, status }) {
  const [sparkId, setSparkId] = useState('day')
  const [custom, setCustom] = useState(null)
  const [dates, setDates] = useState(() => ({ start: toInput(new Date()), end: toInput(new Date()) }))
  const [dateError, setDateError] = useState('')
  const spark = sparkId === 'custom' ? custom : SPARK.find((s) => s.id === sparkId)
  const limits = fullWindow()
  const choosePreset = (s) => {
    setSparkId(s.id); setDateError('')
    const end = limits.end, start = new Date(end)
    if (!s.intraday) start.setDate(start.getDate() - s.days)
    setDates({ start: toInput(start), end: toInput(end) })
  }
  const applyDates = (next) => {
    setDates(next)
    const selection = selectedPeriod(next.start, next.end)
    setDateError(selection.error || '')
    if (!selection.error) { setCustom(selection); setSparkId('custom') }
  }
  const chooseDate = (key, value) => applyDates({ ...dates, [key]: value })
  const openSelected = (code) => onOpen(code, spark)
  const since = toInput(limits.start).split('-').reverse().join('/')
  const dm = (iso) => iso.split('-').reverse().slice(0, 2).join('/')
  return (
      <Expandable label="card das moedas" compact>
      <section aria-labelledby="r-moedas" className="moedas">
        <header className="mo-head">
          <div className="mo-title">
            <h2 id="r-moedas">Moedas <Explain id="minigrafico" /></h2>
            {status}
          </div>
          <div className="mo-tools">
            <div className="seg mo-seg" role="group" aria-label="Período do minigráfico">
              {SPARK.map((s) => (
                <button key={s.id} type="button" aria-pressed={sparkId === s.id} onClick={() => choosePreset(s)}>
                  {s.label}
                </button>
              ))}
            </div>
            <details className="mo-dates">
              <summary className={`icon-btn${sparkId === 'custom' ? ' is-on' : ''}`} aria-label="Escolher datas do minigráfico" title="Escolher datas">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
                {sparkId === 'custom' && <span className="mo-dates-label">{dm(dates.start)}–{dm(dates.end)}</span>}
              </summary>
              <div className="mo-dates-pop">
                <label>De <input aria-label="Data inicial dos gráficos" type="date" min={toInput(limits.start)} max={toInput(limits.end)} value={dates.start} onChange={(e) => chooseDate('start', e.target.value)} /></label>
                <label>Até <input aria-label="Data final dos gráficos" type="date" min={toInput(limits.start)} max={toInput(limits.end)} value={dates.end} onChange={(e) => chooseDate('end', e.target.value)} /></label>
              </div>
            </details>
            <Help label="Sobre os minigráficos" icon="i" align="right">
              <span className="ex">Minigráficos: {spark.label}. Histórico desde {since}; cada fonte pode ter lacunas.</span>
              <span className="ex">O preço em destaque é sempre a última cotação, não o histórico filtrado.</span>
              <span className="ex">A barra fina sob o preço mostra onde a cotação está entre a mínima e a máxima do dia.</span>
            </Help>
            <button type="button" className="icon-btn img-share" aria-label="Enviar imagem das cotações" title="Enviar imagem das cotações" onClick={() => shareQuotesImage(quotes)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg></button>
          </div>
        </header>
        {dateError && <p role="alert" className="status stale">{dateError} O período anterior permanece aplicado.</p>}
        <div className="tiles qt-grid">
          {CURRENCIES.map((c) => (
            <Tile key={c.code} code={c.code} quote={quotes?.[c.code]} ptax={ptax?.[c.code]} spark={spark} onOpen={openSelected} color={colors?.[c.code]} />
          ))}
          <ParityTile quotes={quotes} spark={spark} onOpen={openSelected} color={colors?.PAR} />
          <OilTile spark={spark} dates={dates} presets={SPARK} onDates={applyDates} onPreset={choosePreset} dateError={dateError} />
        </div>
        <ResumoChart colors={colors} spark={spark} />
      </section>
      </Expandable>
  )
}

// Faixa de juros no topo do app (todas as abas): rótulo com "?" e os indicadores parados, todos visíveis na tela (quebram de linha se faltar espaço).
export function RatesTop({ macro, curves, onOpen }) {
  const rates = rateTiles(macro.data, curves.data)
  return (
    <div className="rates-top">
      <span className="rates-label">Juros <Explain id="faixaJuros" /></span>
      {rates.length ? (
        <div className="rates-grid" role="region" aria-label={`Juros: ${rates.map((r) => `${r.label} ${p2(r.value)}%`).join('; ')}`}>
          {rates.map((r) => (
            <button type="button" key={r.key} className="qb" onClick={onOpen} title={`${r.sub}${r.delta != null && r.prevAt ? ` · variação sobre a publicação anterior (${new Date(r.prevAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })})` : ''}`}>
              <b className="tk">{r.label}</b> {p2(r.value)}%
              {r.delta != null && (
                <span className="qb-delta">
                  {' '}{Math.round(r.delta * 100) === 0 ? <span title="sem variação">=</span> : <><Arrow v={r.delta} /> {bps(r.delta)}</>}
                </span>
              )}
              <small className="muted"> {r.short ?? r.sub}</small>
              {Date.now() - r.at > 4 * 864e5 && <small className="qb-old"> · {new Date(r.at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}</small>}
            </button>
          ))}
        </div>
      ) : (
        <p className="status">Juros indisponíveis no momento.</p>
      )}
    </div>
  )
}

export default function Resumo({ quotes, ptax, onOpen, colors, status }) {
  return (
    <div className="resumo">
      <MoedasPanel quotes={quotes} ptax={ptax} onOpen={onOpen} colors={colors} status={status} />
    </div>
  )
}

// "O que move o mercado" e "Agenda econômica": ficam na aba Notícias.
export function MoveAgenda({ goto, colors }) {
  const news = useNews()
  const heads = topHeadlines(news.data)
  const events = upcoming(new Date(), 14).slice(0, 3)
  const fmtDay = (t) => new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).replace('.', '')
  const fmtTime = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

  return (
    <div className="resumo">
      <section aria-labelledby="r-move">
        <div className="sec-head">
          <h2 id="r-move">O que move o mercado <Explain id="noticias" /></h2>
        </div>
        <ul className="list">
          {heads.length ? (
            heads.map((n) => (
              <li key={n.code + n.link}>
                <a href={n.link} target="_blank" rel="noopener noreferrer">
                  <span className="dotbadge" style={{ background: colors[n.code] }}>{n.code}</span>
                  <span className="list-text">
                    <b>{n.title}</b>
                    <small className="muted">{n.source} · {ago(n.t)}{n.original ? ' · traduzida' : ''}</small>
                  </span>
                </a>
              </li>
            ))
          ) : (
            <li className="status">{news.error ? 'Notícias indisponíveis no momento.' : 'Carregando notícias…'}</li>
          )}
        </ul>
      </section>

      <section aria-labelledby="r-agenda">
        <div className="sec-head">
          <h2 id="r-agenda">Agenda econômica <Explain id="agenda" /></h2>
          <button type="button" className="more" onClick={() => goto('cenarios')}>Ver agenda ›</button>
        </div>
        <ul className="list">
          {events.length ? (
            events.map((e) => (
              <li key={e.kind + e.t}>
                <button type="button" onClick={() => goto('cenarios')}>
                  <span className="dotbadge cal">{e.kind}</span>
                  <span className="list-text">
                    <b>{e.label}</b>
                    <small className="muted">{fmtDay(e.t)} · {fmtTime(e.t)} · Brasília</small>
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="status">Sem eventos nos próximos dias.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
