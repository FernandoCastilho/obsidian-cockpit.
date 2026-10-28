import { Aviso } from './Avisos.jsx'
import { buildFeed } from './feed.js'
import RefreshButton from './RefreshButton.jsx'
import './MarketTable.css'
import './MarketTerminal.css'
import { accumulatedReturns, compatiblePtax, marketDate } from './marketReturns.js'
import { quoteAgeState } from './quoteFreshness.js'
import { nextChartIndex } from './chartNavigation.js'
import { dataTimestamp } from './dataTimestamp.js'
import { comparisonSeries } from './comparisonSeries.js'
import Expandable from './Expandable.jsx'
import ChartFilters from './ChartFilters.jsx'
import OilTile from './OilTile.jsx'
import { selectedPeriod } from './summaryPeriod.js'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Explain from './Explain.jsx'
import { CURRENCIES, seriesName } from './useQuotes.js'
import { centralFull, fullWindow, fromInput, toInput, useHistory, useIntraday, useCentralDaily } from './useHistory.js'
import { liveCross, mergeDaily, mergeTicks } from './parity.js'
import { periodChange } from './stats.js'
import { flagSvg } from './flags.js'
import Flag from './Flag.jsx'
import { shareQuotesImage } from './shareImage.js'
import { rateTiles, topHeadlines } from './snapshot.js'
import { upcoming } from './agenda.js'
import { useNews } from './useNews.js'
import Sparkline from './Sparkline.jsx'
import { Plot, useWidth, fmtTime } from './HistoryChart.jsx'
import { KpiRow, Panel } from './TerminalDesk.jsx'
import { useDataFile } from './useDataFile.js'
const RateModal = lazy(() => import('./RateModal.jsx'))

const brl = (v, d = 4) => !Number.isFinite(v) ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}`
const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2).replace('.', ',')}%`
const p2 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  const win = fullWindow(fromInput(marketDate(Date.now())))
  return { start: new Date(win.end.getTime() - days * 864e5), end: win.end }
}

function Arrow({ v }) {
  return <span aria-hidden="true">{v > 0 ? '▲' : v < 0 ? '▼' : '■'}</span>
}

function QuoteRow({ code, quote, ptax, returns, selected, onOpen, color }) {
  const cur = CURRENCIES.find(c => c.code === code)
  const hasDay = !!quote && !quote.fallback && Number.isFinite(quote.pct)
  const delta = hasDay && Number.isFinite(quote.delta) ? quote.delta : null
  const open = () => onOpen(code)
  const series = quote?.source || code
  return <tbody className={'market-record' + (selected ? ' is-selected' : '')} style={{ '--series': color }}>
    <tr className="market-values" onClick={open}>
      <th scope="row"><button type="button" className="market-open" aria-pressed={selected} onClick={e => { e.stopPropagation(); open() }} aria-label={cur.name + ': abrir gráfico'}>
        <b><Flag code={series} width={20} height={14} /> {series}/BRL <span aria-hidden="true">›</span></b><small>{seriesName(cur, series)}</small>
        {quoteAgeState(quote) && <small className="market-state">{quoteAgeState(quote)}</small>}
      </button></th>
      <td className="market-price">{quote ? brl(quote.bid, code === 'JPY' ? 5 : 4).replace('R$ ', '') : <span className="muted">—</span>}</td>
      <td className={delta == null ? 'muted' : 'pct ' + toneOf(delta)}>{delta == null ? <span aria-label={quote?.cross ? 'Variação absoluta indisponível para o cruzamento' : 'Variação absoluta indisponível'} title={quote?.cross ? 'A fonte não fornece variação absoluta deste cruzamento' : 'Variação absoluta não fornecida'}>—</span> : (delta > 0 ? '+' : delta < 0 ? '−' : '') + Math.abs(delta).toLocaleString('pt-BR', { minimumFractionDigits: code === 'JPY' ? 5 : 4, maximumFractionDigits: code === 'JPY' ? 5 : 4 })}</td>
      <td className={hasDay ? 'pct ' + toneOf(quote.pct) : 'muted'}>{hasDay ? pct(quote.pct) : <span aria-label="Variação percentual do dia indisponível">—</span>}</td>
      {['month', 'year'].map(period => <td key={period} className={returns?.[period] ? 'pct ' + toneOf(returns[period].value) : 'muted'}>{returns?.[period] ? pct(returns[period].value) : <span aria-label={(period === 'month' ? 'Acumulado do mês' : 'Acumulado do ano') + ' indisponível'}>—</span>}</td>)}
      <td className="market-ptax">{ptax ? brl(ptax.sell, code === 'JPY' ? 5 : 4).replace('R$ ', '') : <span aria-label="PTAX compatível indisponível">—</span>}</td>
    </tr>
  </tbody>
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
  const bi = useIntraday(base, spark.day ? fromInput(spark.day) : fromInput(marketDate(Date.now())), !dia)
  const qi = useIntraday(quote, spark.day ? fromInput(spark.day) : fromInput(marketDate(Date.now())), !dia)
  const [a, b] = dia ? [qi, bi] : [qh, bh]
  const pts = a.status === 'ok' && b.status === 'ok' ? (dia ? mergeTicks : mergeDaily)(a.data.points, b.data.points, true) : []
  const change = periodChange(pts)
  const p = liveCross(quotes?.[base], quotes?.[quote])
  const hasDay = !!p && p.comparable !== false && !quotes[base].fallback && !quotes[quote].fallback
  const trend = toneOf(hasDay ? p.pct : change)
  const eurUsd = base === 'EUR' && quote === 'USD'
  const [big, setBig] = useState(false)
  return (
    <>
    <div style={{ '--series': color }} className="tile wide pair-tile">
      <span className="tile-head">
        <span className="flag" aria-hidden="true" dangerouslySetInnerHTML={{ __html: flagSvg(base, 'width="26" height="18"') }} />
        <PairSelect value={base} onChange={(v) => pick('base', v)} label="Moeda base" />
        <span className="pair-slash" aria-hidden="true">/</span>
        <PairSelect value={quote} onChange={(v) => pick('quote', v)} label="Moeda cotada" />
        <span className="flag" aria-hidden="true" dangerouslySetInnerHTML={{ __html: flagSvg(quote, 'width="26" height="18"') }} />
        <button type="button" className="more" onClick={() => (eurUsd ? onOpen('PAR') : pts.length > 1 && setBig(true))}>Detalhes ›</button>
      </span>
      <span className="tile-body">
        <span className="tile-num">
          <span className="tile-price">{p ? cross(p.main, quote) : '—'}</span>
          {hasDay ? (
            <span className={`pct ${trend}`}>
              <Arrow v={p.pct} /> {pct(p.pct)}
            </span>
          ) : (
            p && <small className="muted">{p.comparable === false ? 'var. do dia indisponível: cotações de horários distintos' : 'var. do dia indisponível'}</small>
          )}
          <small className="muted">{NAMES[quote]} por 1 {NAMES[base].toLowerCase()}{(a.stale || b.stale) && ' · última série disponível'}</small>
        </span>
        {pts.length > 0 && <span className="tile-spark expandable" role="button" tabIndex={0} title="Ampliar" onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && pts.length > 1) { e.preventDefault(); setBig(true) } }} onClick={() => pts.length > 1 && setBig(true)}>
          <Sparkline points={pts} tone={change != null ? toneOf(change) : trend} />
        </span>}
      </span>
          <small className="muted tile-period">
            {spark.label}
            {change != null ? <span className={`pct ${toneOf(change)}`}> {pct(change)}</span> : spark.intraday && (a.status === 'error' || b.status === 'error' ? ' · falha na consulta' : a.status === 'empty' || b.status === 'empty' ? ' · sem amostras em comum' : ' · variação indisponível')}
          </small>
    </div>
    {big && (
      <Expandable modal label="Detalhes da taxa cruzada" onClose={() => setBig(false)}>
        <div className="resumo-chart big">
          <h3>{base}/{quote} <small className="muted">· {spark.label}</small>{change != null && <span className={`pct ${toneOf(change)}`}> {pct(change)}</span>}</h3>
          {(a.stale || b.stale) && <p className="status stale" role="status">Não foi possível atualizar. Paridade calculada com a última série disponível.</p>}
          <Wide render={(wv) => <Plot points={pts} width={wv} color={color} code={`par-${base}-${quote}-${spark.id}`} intraday={dia} fmt={(v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} vfmt={(v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} labels label={`${base}/${quote}`} />} />
        </div>
      </Expandable>
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
  const fmtX = (t) => (intraday ? fmtTime(t) : new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }))
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * width
    setHover(t0 + ((px - M.l) / iw) * (t1 - t0))
  }
  const at = (s, t) => s.pts.reduce((b, p) => (Math.abs(p.t - t) < Math.abs(b.t - t) ? p : b), s.pts[0])
  const times = [...new Set(all.map(p => p.t))].sort((a,b) => a-b)
  const onKey = e => {
    const current = hover == null ? 0 : times.reduce((best,t,i) => Math.abs(t-hover)<Math.abs(times[best]-hover) ? i : best,0)
    const next = nextChartIndex(e.key,current,times.length)
    if (next != null) { e.preventDefault(); setHover(times[next]) }
  }
  return (
    <><svg className="hist-svg" viewBox={`0 0 ${width} ${H}`} width="100%" role="img" tabIndex={0} onKeyDown={onKey} onFocus={() => setHover(t0)} aria-label="Variação percentual das moedas selecionadas no período; use setas, Home e End para consultar amostras" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }}>
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
                <rect x={bx} y={M.t} width={bw} height={bh} rx="8" fill="var(--card, #161b22)" stroke="var(--line)" opacity="0.96" />
                <text className="comparison-tooltip-time" x={bx + 10} y={M.t + 16} fontSize="11" fill="var(--mut)">{intraday ? fmtTime(p0.t) : new Date(p0.t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</text>
                {norm.map((s, k) => {
                  const p = at(s, hover)
                  const d = s.code === 'JPY' ? 4 : 4
                  return (
                    <text key={s.code} x={bx + 10} y={M.t + 34 + k * 18} fontSize="12" fill="var(--txt, #e6edf3)">
                      <tspan fill={s.color} fontWeight="700">{s.code}</tspan>
                      <tspan dx="6">{p.bid.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}</tspan>
                      <tspan dx="6" fill={p.v > 0 ? '#3fb950' : p.v < 0 ? '#f85149' : 'var(--mut)'}>{pct(p.v)}</tspan>
                    </text>
                  )
                })}
              </g>
            )
          })()}
        </g>
      )}
    </svg><p className="chart-access-text" role="status" aria-live="polite">{hover != null && `${fmtX(hover)} · ${norm.map(s => s.code + ': ' + pct(at(s,hover).v)).join(' · ')}`}</p></>
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

function ResumoChart({ colors, spark, selection: sel, onSelection: setSel, onPrevious, comparison = false }) {
  const w = useWindow(spark)
  const dia = !!spark.intraday
  // hooks em número fixo (uma consulta por moeda; ficam em cache)
  const hs = CURRENCIES.map((c) => useHistory(c.code, w.start, w.end, dia)) // eslint-disable-line react-hooks/rules-of-hooks
  const is = CURRENCIES.map((c) => useIntraday(c.code, spark.day ? fromInput(spark.day) : fromInput(marketDate(Date.now())), !dia)) // eslint-disable-line react-hooks/rules-of-hooks
  const [ref, width] = useWidth()
  const central = useCentralDaily()
  const toggle = (code) => setSel((s) => (s.includes(code) ? (s.length > 1 ? s.filter((c) => c !== code) : s) : CURRENCIES.map((c) => c.code).filter((c) => c === code || s.includes(c))))
  const rows = CURRENCIES.map((c, k) => {
    const st = dia ? is[k] : hs[k]
    return { code: c.code, color: colors?.[c.code], st, points: st.status === 'ok' ? st.data.points : [], source: st.data?.source }
  }).filter((r) => sel.includes(r.code))
  const { available: ready, comparable, incomplete } = comparisonSeries(rows)
  const staleCodes = rows.filter((r) => r.st.stale).map((r) => r.code)
  const incompleteNote = incomplete.length > 0 && <p className="status" role="status">{incomplete.map((r) => `${r.code}: ${r.points.length === 1 ? `uma cotação no período (${brl(r.points[0].bid)}); aguardando outra para calcular variação` : r.st.status === 'empty' ? 'sem amostras na data selecionada' : r.st.error || 'aguardando cotações'}`).join(' · ')}</p>
  const staleNote = staleCodes.length > 0 && <p className="status stale" role="status">Não foi possível atualizar {staleCodes.join(', ')}. Mantida a última série disponível.</p>
  const failed = rows.every((r) => r.st.status === 'error')
  const one = rows.length === 1
  const r0 = rows[0]
  const chg = (r) => periodChange(r.points)
  const [big, setBig] = useState(false)
  const chart = (wv) => (
        ready.length > 0 && (one || comparable.length > 0) ? (
          one ? (
            <Plot points={r0.points} history={dia ? undefined : centralFull(central.data, r0.code, r0.source)} width={wv} color={r0.color} code={`rs-${r0.code}-${spark.id}`} intraday={dia} fmt={(v) => brl(v)} vfmt={(v) => v.toLocaleString('pt-BR', { minimumFractionDigits: v < 0.1 ? 5 : 4, maximumFractionDigits: v < 0.1 ? 5 : 4 })} labels label={`${r0.source ?? r0.code}/BRL`} />
          ) : (
            <MultiPlot series={comparable} width={wv} intraday={dia} />
          )
        ) : (
          <div className="placeholder" style={{ height: 120 }}>
            {failed ? 'Histórico indisponível no momento.' : rows.some((r) => r.st.status === 'loading') ? 'Carregando…' : dia ? 'Sem amostras na data selecionada. Isso não confirma fechamento do mercado.' : 'Histórico indisponível no momento.'}
          </div>
        )
  )
  return (
    <>
    <div className="resumo-chart">
      <div className="sec-head">
        <h3 className={comparison ? '' : 'expandable'} tabIndex={comparison ? undefined : 0} onKeyDown={(e) => { if (!comparison && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setBig(true) } }} onClick={() => !comparison && setBig(true)} role={comparison ? undefined : 'button'} title={comparison ? undefined : 'Ampliar'}>
          {one ? <>{`${r0.source ?? r0.code}/BRL`} <small className="muted">· {spark.label}</small>{chg(r0) != null && <span className={`pct ${toneOf(chg(r0))}`}> {pct(chg(r0))}</span>}</> : <>Variação no período <small className="muted">· {spark.label}</small></>}
          {!comparison && <span className="muted" aria-hidden="true"> ›</span>}
        </h3>
        {comparison && <div className="chips" role="group" aria-label="Moedas do gráfico (escolha uma ou mais)">
          {CURRENCIES.map((c) => (
            <button key={c.code} type="button" aria-pressed={sel.includes(c.code)} style={sel.includes(c.code) ? { borderColor: colors?.[c.code] } : undefined} onClick={() => toggle(c.code)}>
              {sel.includes(c.code) && <i className="chip-dot" style={{ background: colors?.[c.code] }} aria-hidden="true" />}
              {c.code}
            </button>
          ))}
        </div>}
      </div>
      {!one && (
        <p className="chart-legend">
          {rows.map((r) => (
            <span key={r.code}><i className="chip-dot" style={{ background: r.color }} aria-hidden="true" />{r.code} {chg(r) != null && <b className={`pct ${toneOf(chg(r))}`}>{pct(chg(r))}</b>}</span>
          ))}
        </p>
      )}
      <p className="chart-basis">{one && r0.points.length ? `Desde a 1ª amostra: ${dataTimestamp(r0.points[0].t)} até ${dataTimestamp(r0.points.at(-1).t)}. ` : 'Comparação normalizada desde a primeira amostra disponível de cada série. '}A variação deste gráfico não é o Δ dia da fonte contra a referência anterior. Horários em Brasília; amostras podem ter lacunas.</p>
      {staleNote}
      {incompleteNote}
      {dia && rows.some(r => r.st.previousDay) && <button type="button" className="btn" onClick={() => onPrevious(rows.map(r => r.st.previousDay).filter(Boolean).sort().at(-1))}>Ver último dia anterior com amostras disponíveis</button>}
      <div ref={ref}>
        {chart(width)}
      </div>
      <footer className="terminal-chart-source muted">{rows.filter(r => r.st.data).map(r => r.code + ': ' + (r.st.data.feed || 'AwesomeAPI') + (r.st.data.generatedAt ? ' · arquivo de ' + dataTimestamp(r.st.data.generatedAt) : ' · data do arquivo não disponível')).join(' | ')}</footer>
    </div>
    {big && (
      <Overlay onClose={() => setBig(false)}>
        <div className="resumo-chart big">
      <div className="sec-head">
        <h3>
          {one ? <>{`${r0.source ?? r0.code}/BRL`} <small className="muted">· {spark.label}</small>{chg(r0) != null && <span className={`pct ${toneOf(chg(r0))}`}> {pct(chg(r0))}</span>}</> : <>Variação no período <small className="muted">· {spark.label}</small></>}
        </h3>
        {comparison && <div className="chips" role="group" aria-label="Moedas do gráfico (escolha uma ou mais)">
          {CURRENCIES.map((c) => (
            <button key={c.code} type="button" aria-pressed={sel.includes(c.code)} style={sel.includes(c.code) ? { borderColor: colors?.[c.code] } : undefined} onClick={() => toggle(c.code)}>
              {sel.includes(c.code) && <i className="chip-dot" style={{ background: colors?.[c.code] }} aria-hidden="true" />}
              {c.code}
            </button>
          ))}
        </div>}
      </div>
      {!one && (
        <p className="chart-legend">
          {rows.map((r) => (
            <span key={r.code}><i className="chip-dot" style={{ background: r.color }} aria-hidden="true" />{r.code} {chg(r) != null && <b className={`pct ${toneOf(chg(r))}`}>{pct(chg(r))}</b>}</span>
          ))}
        </p>
      )}
          {staleNote}
      {incompleteNote}
          <p className="chart-basis">Variação desde a primeira amostra disponível na janela selecionada; não é o Δ dia da fonte. Horários em Brasília.</p>
          <Wide render={chart} />
        </div>
      </Overlay>
    )}
    </>
  )
}

// Quadros das moedas com minigráfico e seletor de período (o seletor vale só para o câmbio).
function MoedasPanel({ quotes, ptax, onOpen, colors, quoteRefresh, oilRequest }) {
  const daily = useCentralDaily()
  const returns = Object.fromEntries(CURRENCIES.map(c => [c.code, quotes?.[c.code]?.source && quotes[c.code].source !== c.code ? { month: null, year: null } : accumulatedReturns(daily.data, c.code)]))
  const ptaxes = Object.fromEntries(CURRENCIES.map(c => [c.code, compatiblePtax(c.code, quotes?.[c.code], ptax?.[c.code])]))
  const [selection, setSelection] = useState(['USD'])
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareSelection, setCompareSelection] = useState(['USD', 'EUR'])
  const [compareSpark, setCompareSpark] = useState(SPARK[0])
  const compareTrigger = useRef(null)
  const today = marketDate(Date.now())
  const closeCompare = () => { setCompareOpen(false); requestAnimationFrame(() => compareTrigger.current?.focus()) }

  const [sparkId, setSparkId] = useState('day')
  const [custom, setCustom] = useState(null)
  const [dates, setDates] = useState(() => ({ start: marketDate(Date.now()), end: marketDate(Date.now()) }))
  const [dateError, setDateError] = useState('')
  useEffect(() => { if (sparkId === 'day') setDates({ start: today, end: today }) }, [today, sparkId])
  const spark = (sparkId === 'custom' || sparkId === 'previous') ? custom : SPARK.find((s) => s.id === sparkId)
  const limits = fullWindow(fromInput(marketDate(Date.now())))
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
    if (!selection.error) { if (next.start === today && next.end === today) { setSparkId('day') } else { setCustom(selection); setSparkId('custom') } }
  }
  const openSelected = code => { if (CURRENCIES.some(c => c.code === code)) setSelection([code]); onOpen(code, spark) }
  return (
      <Expandable label="Mercado hoje">
      <section className="market-terminal" aria-labelledby="r-moedas">
        <div className="sec-head terminal-titlebar">
          <h2 id="r-moedas">Mercado hoje <Explain id="mercadoHoje" /> <button type="button" className="img-share" aria-label="Enviar imagem das últimas cotações de câmbio" title="Compartilha as últimas cotações de câmbio, sem gráficos ou petróleo" onClick={() => shareQuotesImage(quotes)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg></button></h2>
          {quoteRefresh && <RefreshButton custom={quoteRefresh} label="cotações do câmbio" />}
          <button type="button" ref={compareTrigger} className="compare-trigger" aria-label="Comparar moedas" aria-haspopup="dialog" aria-expanded={compareOpen} title="Montar comparação de moedas" onClick={() => setCompareOpen(true)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 3v18h18M5 16l5-7 4 4 6-9M5 10l5 4 5-7 5 9" /></svg><span>Comparar</span></button>
        </div>
        <div className="terminal-main">
        <div className="terminal-quotes">
        <p className="market-scroll-hint">Deslize para ver mês, ano e PTAX →</p>
        <div className="market-table-wrap" role="region" aria-label="Tabela de câmbio; role horizontalmente para ver todas as colunas" tabIndex={0}>
          <table className="market-table" aria-busy={!quotes}>
            <caption className="market-caption">Câmbio em reais · últimas referências disponíveis</caption>
            <thead><tr><th scope="col">Par</th><th scope="col">Cotação <small>(R$)</small></th><th scope="col" aria-label="Variação absoluta do dia em reais">Δ dia <small>(R$)</small></th><th scope="col" aria-label="Variação percentual do dia">Δ dia %</th><th scope="col" aria-label="Acumulado no mês em percentual">Mês %</th><th scope="col" aria-label="Acumulado no ano em percentual">Ano %</th><th scope="col" aria-label="PTAX de venda em reais por unidade">PTAX <small>venda</small></th></tr></thead>
            {CURRENCIES.map(c => <QuoteRow key={c.code} code={c.code} quote={quotes?.[c.code]} returns={returns[c.code]} selected={selection.includes(c.code)} ptax={ptaxes[c.code]} onOpen={openSelected} color={colors?.[c.code]} />)}
          </table>
        </div>
        </div>
        <div className="terminal-chart terminal-news">
        <Panel title="Manchetes" note="por moeda" refresh={['news.json']}><MarketNews bare /></Panel>
        </div>
        </div>


        <OilTile table openRequest={oilRequest} spark={spark} dates={dates} presets={SPARK} onDates={applyDates} onPreset={choosePreset} dateError={dateError} />
        <Aviso title="Câmbio · fontes, datas e metodologia">
          <p id="market-help">Toque na linha para selecionar e abrir o gráfico. Filtros alteram apenas os gráficos. Cotação e Δ dia: última referência da fonte; mês/ano: observações diárias de dias encerrados, não a cotação intradiária.</p>
          <p>—: dado ou cobertura compatível indisponível. CNH offshore: USD/BRL ÷ USD/CNH; sem variação absoluta fornecida. PTAX não se aplica a CNH; CNY não é CNH.</p>
          <ul>{CURRENCIES.map(c => { const q = quotes?.[c.code], p = ptaxes[c.code], r = returns[c.code]; return <li key={c.code}>
            <b>{q?.source || c.code}/BRL:</b> <span className={quoteAgeState(q) ? 'status stale' : ''}>{!q ? quotes ? 'Cotação indisponível' : 'Carregando cotação' : (q.stale ? 'Atualização pendente · ' : q.fallback ? 'Referência diária de reserva · ' : quoteAgeState(q) ? quoteAgeState(q) + ' · ' : '') + dataTimestamp(q.timestamp)}</span>
            {' · '}{q ? q.fallback ? 'BCE · referência diária' : q.cross ? 'AwesomeAPI · CNH offshore por cruzamento' : 'AwesomeAPI' : 'Aguardando fonte válida'}
            {p && <> · BCB PTAX venda, boletim {p.kind}, {p.date.split('-').reverse().join('/')}, R$ por 1 {c.code}</>}
            {['month', 'year'].map(k => <span key={k}> · {k === 'month' ? 'Mês' : 'Ano'}: {r[k] ? `base ${r[k].baseDate.split('-').reverse().join('/')} → ${r[k].endDate.split('-').reverse().join('/')}` : 'sem base/cobertura compatível'}</span>)}
          </li> })}</ul>
          <p>Acumulados: (última observação diária ÷ última observação diária anterior ao início do mês/ano − 1) × 100, mesma série AwesomeAPI. Dias civis em America/Sao_Paulo. Barras do dia atual excluídas; lacunas superiores a 7 dias junto à base ou ao fim impedem o cálculo. {daily.status === 'error' ? 'Falha ao consultar o histórico dos acumulados.' : daily.status === 'loading' ? 'Carregando histórico dos acumulados.' : 'Arquivo histórico: ' + dataTimestamp(daily.data?.generatedAt)}</p>
          <p>PTAX é referência oficial independente, não spot. <a href="https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes" target="_blank" rel="noreferrer">BCB: cotações e boletins</a> · <a href="https://docs.awesomeapi.com.br/api-de-moedas" target="_blank" rel="noreferrer">AwesomeAPI: cotações e histórico</a>. Gráficos: {spark.label}; histórico desde {toInput(limits.start).split('-').reverse().join('/')}, sujeito a lacunas.</p>
          <p>Cotação do dia: última referência recebida, não um feed em tempo real. A coleta central é de 5 min na janela configurada e horária fora dela em dias úteis, com pausa de coleta no fim de semana; o navegador verifica a cada minuto e o arquivo também pode ter cache. “Dado antigo” sinaliza horário da fonte há mais de 10 min; esse limite não é garantia de latência. O horário original permanece indicado acima. A fonte não informa abertura/fechamento do mercado: ausência de novo preço não é tratada como mercado fechado.</p>
          </Aviso>
      </section>
      {compareOpen && <Expandable modal label="Comparar moedas" onClose={closeCompare}>
        <section className="currency-comparison" aria-labelledby="comparison-title"><h2 id="comparison-title">Comparar moedas</h2>
          <h3>Taxa entre duas moedas</h3><ParityTile quotes={quotes} spark={spark} onOpen={code => { closeCompare(); openSelected(code) }} color={colors?.PAR} />
          <h3>Evolução comparada em percentual</h3>
          <ChartFilters><div className="seg" role="group" aria-label="Período do comparador">{SPARK.map(p => <button type="button" key={p.id} aria-pressed={compareSpark.id === p.id} onClick={() => setCompareSpark(p)}>{p.label}</button>)}</div></ChartFilters>
          <ResumoChart comparison colors={colors} spark={compareSpark} selection={compareSelection} onSelection={setCompareSelection} onPrevious={day => setCompareSpark({ id:'previous', label:`Amostras de ${day.split('-').reverse().join('/')}`, intraday:true, day })} />
        </section>
      </Expandable>}
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

function MarketNews({ bare = false }) {
  const news = useNews()
  const headlines = buildFeed(news.data?.news, 'ALL', 8)
  return <aside className="market-news" aria-labelledby="market-news-title"><h2 id="market-news-title" className={bare ? 'sr-only' : undefined}>Notícia</h2>
    {news.error && <p role="status">Não foi possível atualizar as notícias. {headlines.length ? 'Últimos títulos preservados.' : ''}</p>}
    {news.data && Object.keys(news.data.stale || {}).length > 0 && <p role="status">Há fontes sem novas manchetes; títulos anteriores preservados.</p>}
    {!headlines.length && <p>{news.status === 'loading' ? 'Carregando notícias.' : 'Sem notícias disponíveis.'}</p>}
    <ul>{headlines.map(n => <li key={n.link}><a href={n.link} target="_blank" rel="noopener noreferrer">{n.title}</a><small>{n.source || 'Fonte não informada'} · {n.t && Number.isFinite(new Date(n.t).getTime()) ? new Date(n.t).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}) + ' (Brasília)' : 'Data de publicação não informada'}</small></li>)}</ul>
  </aside>
}
// Mercado: cards de câmbio e juros, tabela de pares com manchetes e referência do Brent. Juros, curvas e agenda ficam nas próprias abas.
export default function Resumo({ quotes, ptax, onOpen, colors, macro, curves, goto, status, quoteRefresh }) {
  const rates = rateTiles(macro?.data, curves?.data)
  const [rateOpen, setRateOpen] = useState(null)
  const [oilRequest, setOilRequest] = useState(0)
  const oil = useDataFile('oil.json')
  return (
    <div className="terminal-desk">
      <KpiRow quotes={quotes} rates={rates} oil={oil.data} colors={colors} onOpen={onOpen} onRate={setRateOpen} onOil={() => setOilRequest((n) => n + 1)} goto={goto} status={status} />
      {rateOpen && <Suspense fallback={null}><RateModal kind={rateOpen} macro={macro} curves={curves} onClose={() => setRateOpen(null)} /></Suspense>}
      <div className="resumo desk-markets"><MoedasPanel quotes={quotes} ptax={ptax} onOpen={onOpen} colors={colors} quoteRefresh={quoteRefresh} oilRequest={oilRequest} /></div>
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
